from datetime import datetime, timezone
from time import perf_counter
from typing import Any

import numpy as np

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


app = FastAPI(
    title="Comercial Nova - API de Segmentación",
    description=(
        "API académica para segmentación de clientes "
        "mediante aprendizaje no supervisado."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^http://(localhost|127\.0\.0\.1):"
        r"517[3-9]$"
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class CustomerInput(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        allow_inf_nan=False,
        str_strip_whitespace=True,
    )

    id: str = Field(min_length=1, max_length=20)
    gastoAcumulado: float = Field(ge=0)
    visitas6Meses: int = Field(ge=0)
    antiguedadMeses: int = Field(ge=0)


class SegmentationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    k: int = Field(ge=2, le=5)

    customers: list[CustomerInput] = Field(
        min_length=2,
    )

    @model_validator(mode="after")
    def validate_customers(self):
        if len(self.customers) < self.k:
            raise ValueError(
                "El número de clientes válidos debe "
                "ser mayor o igual que K."
            )

        identifiers = [
            customer.id.strip().upper()
            for customer in self.customers
        ]

        if len(identifiers) != len(set(identifiers)):
            raise ValueError(
                "Existen códigos de clientes duplicados."
            )

        return self


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request,
    exc: RequestValidationError,
):
    errors = exc.errors()

    message = (
        str(errors[0].get("msg", "Datos inválidos"))
        if errors
        else "La solicitud contiene datos inválidos."
    )

    return JSONResponse(
        status_code=400,
        content={"detail": message},
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Comercial Nova K-Means",
        "algorithm": "scikit-learn KMeans",
    }


@app.post("/api/segmentation/run")
def run_segmentation(
    request: SegmentationRequest,
) -> dict[str, Any]:
    started_at = perf_counter()
    customers = request.customers
    k = request.k

    # Únicamente se emplean variables numéricas.
    # El código identifica al cliente, pero no
    # participa en el cálculo de distancias.
    features = np.array(
        [
            [
                customer.gastoAcumulado,
                customer.visitas6Meses,
                customer.antiguedadMeses,
            ]
            for customer in customers
        ],
        dtype=np.float64,
    )

    if not np.isfinite(features).all():
        raise HTTPException(
            status_code=400,
            detail="Los datos contienen números inválidos.",
        )

    unique_points = np.unique(
        features,
        axis=0,
    )

    if len(unique_points) < k:
        raise HTTPException(
            status_code=400,
            detail=(
                "No existen suficientes perfiles "
                "numéricos distintos para generar "
                f"{k} segmentos."
            ),
        )

    # Estandarización: media 0 y desviación
    # estándar 1 para cada variable.
    scaler = StandardScaler()

    scaled_features = scaler.fit_transform(
        features,
    )

    model = KMeans(
        n_clusters=k,
        random_state=42,
        n_init=10,
        max_iter=300,
    )

    labels = model.fit_predict(
        scaled_features,
    )

    if len(set(labels.tolist())) != k:
        raise HTTPException(
            status_code=400,
            detail=(
                "El algoritmo no consiguió generar "
                f"{k} grupos distintos. "
                "Revisa la diversidad de los datos."
            ),
        )

    assignments = [
        {
            "id": customer.id,
            "segmento": int(label),
        }
        for customer, label in zip(
            customers,
            labels,
        )
    ]

    groups = []

    for group_id in range(k):
        mask = labels == group_id

        group_features = features[mask]

        groups.append(
            {
                "segmento": group_id,
                "cantidad": int(mask.sum()),
                "gastoPromedio": round(
                    float(group_features[:, 0].mean()),
                    4,
                ),
                "visitasPromedio": round(
                    float(group_features[:, 1].mean()),
                    4,
                ),
                "antiguedadPromedio": round(
                    float(group_features[:, 2].mean()),
                    4,
                ),
            }
        )

    # Los centroides se transforman nuevamente
    # a las unidades comerciales originales.
    original_centroids = scaler.inverse_transform(
        model.cluster_centers_
    )

    centroids = [
        {
            "segmento": index,
            "gastoAcumulado": round(
                float(center[0]),
                4,
            ),
            "visitas6Meses": round(
                float(center[1]),
                4,
            ),
            "antiguedadMeses": round(
                float(center[2]),
                4,
            ),
        }
        for index, center in enumerate(
            original_centroids
        )
    ]

    return {
        "k": k,
        "tiempoEjecucionMs": round(
            (perf_counter() - started_at) * 1000,
            3,
        ),
        "labels": assignments,
        "groups": groups,
        "centroides": centroids,
        "cantidadProcesada": len(customers),
        "fechaEjecucion": datetime.now(
            timezone.utc
        ).isoformat(),
        "inercia": round(
            float(model.inertia_),
            6,
        ),
        "iteraciones": int(model.n_iter_),
        "variables": [
            "gastoAcumulado",
            "visitas6Meses",
            "antiguedadMeses",
        ],
        "estandarizacion": "StandardScaler",
        "algoritmo": "KMeans",
    }
