from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

CUSTOMERS = [
    ("C001", 1800, 12, 24),
    ("C002", 2200, 15, 30),
    ("C003", 1600, 10, 18),
    ("C004", 180, 2, 3),
    ("C005", 250, 3, 5),
    ("C006", 120, 1, 2),
    ("C007", 850, 7, 12),
    ("C008", 720, 6, 10),
    ("C009", 980, 8, 14),
    ("C010", 400, 4, 8),
    ("C011", 520, 5, 9),
    ("C012", 3000, 18, 36),
]


def dataset():
    return [
        {
            "id": item[0],
            "gastoAcumulado": item[1],
            "visitas6Meses": item[2],
            "antiguedadMeses": item[3],
        }
        for item in CUSTOMERS
    ]


def execute(k=3, customers=None):
    return client.post(
        "/api/segmentation/run",
        json={
            "k": k,
            "customers": (
                dataset()
                if customers is None
                else customers
            ),
        },
    )


def test_health():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_k3_generates_three_groups():
    response = execute()

    assert response.status_code == 200

    result = response.json()

    assert result["k"] == 3
    assert len(result["groups"]) == 3
    assert len(result["labels"]) == 12
    assert result["cantidadProcesada"] == 12


def test_every_customer_has_one_group():
    result = execute().json()

    expected_ids = {
        customer["id"]
        for customer in dataset()
    }

    actual_ids = {
        label["id"]
        for label in result["labels"]
    }

    assert actual_ids == expected_ids

    assert sum(
        group["cantidad"]
        for group in result["groups"]
    ) == 12


def test_reproducible_results():
    first = execute().json()
    second = execute().json()

    assert first["labels"] == second["labels"]
    assert first["groups"] == second["groups"]


def test_rejects_duplicate_identifiers():
    customers = dataset()

    customers[1]["id"] = "c001"

    response = execute(
        customers=customers,
    )

    assert response.status_code == 400


def test_rejects_negative_spending():
    customers = dataset()

    customers[0]["gastoAcumulado"] = -5

    response = execute(
        customers=customers,
    )

    assert response.status_code == 400


def test_rejects_more_clusters_than_records():
    response = execute(
        k=5,
        customers=dataset()[:3],
    )

    assert response.status_code == 400


def test_rejects_invalid_k():
    assert execute(k=1).status_code == 400
    assert execute(k=6).status_code == 400


def test_rejects_identical_profiles():
    customers = [
        {
            "id": f"C{index:03}",
            "gastoAcumulado": 100,
            "visitas6Meses": 2,
            "antiguedadMeses": 4,
        }
        for index in range(1, 6)
    ]

    response = execute(
        k=3,
        customers=customers,
    )

    assert response.status_code == 400


def test_k_values_two_through_five():
    for k in range(2, 6):
        response = execute(k=k)

        assert response.status_code == 200

        result = response.json()

        assert len(result["groups"]) == k
        assert len(result["centroides"]) == k


def test_centroids_and_statistics():
    result = execute().json()

    assert result["estandarizacion"] == "StandardScaler"
    assert result["algoritmo"] == "KMeans"
    assert result["iteraciones"] >= 1
    assert result["inercia"] >= 0

    for group in result["groups"]:
        assert group["cantidad"] >= 1
        assert group["gastoPromedio"] >= 0
        assert group["visitasPromedio"] >= 0
        assert group["antiguedadPromedio"] >= 0


def test_execution_time_is_recorded():
    result = execute(k=3).json()

    assert isinstance(
        result.get("tiempoEjecucionMs"),
        (int, float),
    )

    assert result["tiempoEjecucionMs"] >= 0
    assert result["cantidadProcesada"] == 12
