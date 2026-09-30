"""Iteration 7 tests: Siswa Kelas read-only, Kelas schedule, Analytics proof recap, Bank Soal RBAC/CRUD."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sekolah-portal-11.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

CREDS = {
    "super_admin": ("cassandramarsada@gmail.com", "Admin@Sekolah2026"),
    "guru": ("guru@sekolahku.id", "Guru@2026"),
    "siswa": ("siswa@sekolahku.id", "Siswa@2026"),
    "kepsek": ("kepsek@sekolahku.id", "Kepsek@2026"),
    "tu": ("tu@sekolahku.id", "TU@2026"),
}


def login(role):
    s = requests.Session()
    email, pw = CREDS[role]
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {role} failed: {r.status_code} {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="module")
def admin(): return login("super_admin")
@pytest.fixture(scope="module")
def guru(): return login("guru")
@pytest.fixture(scope="module")
def siswa(): return login("siswa")
@pytest.fixture(scope="module")
def kepsek(): return login("kepsek")
@pytest.fixture(scope="module")
def tu(): return login("tu")


# ---------------- Kelas: siswa read-only ----------------
class TestKelasSiswaRead:
    def test_siswa_can_list_kelas(self, siswa):
        r = siswa.get(f"{API}/kelas")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 0
        names = [k["name"] for k in rows]
        assert "XI IPA 1" in names

    def test_siswa_cannot_create_kelas(self, siswa):
        r = siswa.post(f"{API}/kelas", json={"name": "TEST_forbidden", "subjects": []})
        assert r.status_code == 403


# ---------------- Kelas schedule persistence ----------------
class TestKelasSchedule:
    def test_schedule_persists(self, admin):
        # find XI IPA 1
        rows = admin.get(f"{API}/kelas").json()
        target = next(k for k in rows if k["name"] == "XI IPA 1")
        original_schedule = target.get("schedule", [])
        original_subjects = target.get("subjects", [])
        original_wali = target.get("wali_kelas")

        schedule = [
            {"day": "Senin", "time": "07:00-08:30", "subject": "Matematika", "teacher": "Pak Budi"},
            {"day": "Senin", "time": "08:30-10:00", "subject": "Fisika", "teacher": "Bu Ani"},
            {"day": "Selasa", "time": "07:00-08:30", "subject": "Biologi", "teacher": "Bu Rina"},
        ]
        payload = {"name": target["name"], "wali_kelas": original_wali,
                   "subjects": original_subjects, "schedule": schedule}
        r = admin.patch(f"{API}/kelas/{target['id']}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json().get("schedule") == schedule

        # verify persistence
        rows2 = admin.get(f"{API}/kelas").json()
        again = next(k for k in rows2 if k["id"] == target["id"])
        assert again.get("schedule") == schedule

        # siswa can see the schedule
        rows_siswa = login("siswa").get(f"{API}/kelas").json()
        siswa_view = next(k for k in rows_siswa if k["id"] == target["id"])
        assert siswa_view.get("schedule") == schedule

        # cleanup - restore
        admin.patch(f"{API}/kelas/{target['id']}",
                    json={"name": target["name"], "wali_kelas": original_wali,
                          "subjects": original_subjects, "schedule": original_schedule})


# ---------------- Analytics: proof recap ----------------
class TestAnalyticsProofRecap:
    def test_kepsek_analytics_has_recap(self, kepsek):
        r = kepsek.get(f"{API}/analytics/kepsek")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "proof_by_kelas" in data
        assert "total_proofs" in data
        assert isinstance(data["proof_by_kelas"], list)
        assert isinstance(data["total_proofs"], int)

    def test_super_admin_analytics(self, admin):
        r = admin.get(f"{API}/analytics/kepsek")
        assert r.status_code == 200
        assert "proof_by_kelas" in r.json()


# ---------------- Bank Soal RBAC ----------------
class TestBankSoalRBAC:
    def test_siswa_forbidden(self, siswa):
        r = siswa.get(f"{API}/question-bank")
        assert r.status_code == 403

    def test_tu_forbidden(self, tu):
        r = tu.get(f"{API}/question-bank")
        assert r.status_code == 403

    def test_guru_allowed(self, guru):
        r = guru.get(f"{API}/question-bank")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_super_admin_allowed(self, admin):
        r = admin.get(f"{API}/question-bank")
        assert r.status_code == 200


# ---------------- Bank Soal CRUD & scoping ----------------
_bank_holder = {}

class TestBankSoalCRUD:
    def test_guru_create(self, guru):
        payload = {"q": "TEST_2+3?", "options": ["4","5","6","7"], "answer": 1, "subject": "Matematika"}
        r = guru.post(f"{API}/question-bank", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["q"] == payload["q"]
        assert d["answer"] == 1
        assert d.get("teacher_id")
        _bank_holder["id"] = d["id"]
        _bank_holder["teacher_id"] = d["teacher_id"]

    def test_guru_sees_own(self, guru):
        rows = guru.get(f"{API}/question-bank").json()
        ids = [q["id"] for q in rows]
        assert _bank_holder["id"] in ids
        # all rows belong to this guru
        for q in rows:
            assert q.get("teacher_id") == _bank_holder["teacher_id"]

    def test_super_admin_sees_all(self, admin):
        rows = admin.get(f"{API}/question-bank").json()
        assert any(q["id"] == _bank_holder["id"] for q in rows)

    def test_delete(self, guru):
        r = guru.delete(f"{API}/question-bank/{_bank_holder['id']}")
        assert r.status_code == 200
        # verify gone
        rows = guru.get(f"{API}/question-bank").json()
        assert not any(q["id"] == _bank_holder["id"] for q in rows)


# ---------------- Regression: quiz siswa visibility ----------------
class TestQuizRegression:
    def test_siswa_sees_quizzes(self, siswa):
        r = siswa.get(f"{API}/quizzes")
        assert r.status_code == 200
        rows = r.json()
        # each question must have no 'answer' key
        for q in rows:
            for qq in q.get("questions", []):
                assert "answer" not in qq
