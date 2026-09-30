"""Iteration 6 - New features tests: Bukti Absen RBAC/capture, Inventory stock flow,
Kelas CRUD, Quiz teacher edit/delete, Quiz student visibility & attempt."""
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

TINY_PNG_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


def login(role):
    s = requests.Session()
    email, pw = CREDS[role]
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {role} failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
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


# ---------------- BUKTI ABSEN RBAC ----------------
class TestBuktiAbsenRBAC:
    def test_kepsek_allowed(self, kepsek):
        r = kepsek.get(f"{API}/attendance/proofs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_guru_allowed(self, guru):
        r = guru.get(f"{API}/attendance/proofs")
        assert r.status_code == 200

    def test_super_admin_allowed(self, admin):
        r = admin.get(f"{API}/attendance/proofs")
        assert r.status_code == 200

    def test_siswa_forbidden(self, siswa):
        r = siswa.get(f"{API}/attendance/proofs")
        assert r.status_code == 403

    def test_tu_forbidden(self, tu):
        r = tu.get(f"{API}/attendance/proofs")
        assert r.status_code == 403


# ---------------- BUKTI ABSEN CAPTURE ----------------
class TestBuktiCapture:
    def test_scan_with_photo_creates_proof(self, admin):
        # get siswa qr
        users = admin.get(f"{API}/users").json()
        siswa_u = next(u for u in users if u["email"] == "siswa@sekolahku.id")
        qr = siswa_u["qr_code"]

        r = admin.post(f"{API}/attendance/scan", json={"qr_code": qr, "status": "hadir", "photo": TINY_PNG_B64})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        proofs = admin.get(f"{API}/attendance/proofs").json()
        assert len(proofs) >= 1
        found = [p for p in proofs if p.get("student_id") == siswa_u["id"] and p.get("photo") == TINY_PNG_B64]
        assert found, "captured proof not found"
        p = found[0]
        for k in ("photo", "student_name", "kelas", "status", "captured_at"):
            assert k in p, f"missing {k} in proof"


# ---------------- INVENTORY STOCK FLOW ----------------
class TestInventoryStock:
    def test_borrow_approve_return_stock(self, admin, siswa):
        # create item stock 10
        item = admin.post(f"{API}/inventory", json={"name": "TEST_Bola", "category": "Olahraga", "stock": 10}).json()
        iid = item["id"]
        assert item["stock"] == 10

        # siswa borrows 3
        br = siswa.post(f"{API}/borrow", json={"item_id": iid, "quantity": 3,
                                                 "purpose": "test", "return_date": "2026-12-31"}).json()
        bid = br["id"]

        # approve
        r = admin.patch(f"{API}/borrow/{bid}", params={"status": "Disetujui"})
        assert r.status_code == 200
        inv = admin.get(f"{API}/inventory").json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 7, f"expected 7 after approve, got {cur['stock']}"

        # approve again should not double-deduct
        r = admin.patch(f"{API}/borrow/{bid}", params={"status": "Disetujui"})
        assert r.status_code == 200
        inv = admin.get(f"{API}/inventory").json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 7, f"expected still 7 after re-approve, got {cur['stock']}"

        # return -> stock back to 10
        r = admin.patch(f"{API}/borrow/{bid}", params={"status": "Dikembalikan"})
        assert r.status_code == 200
        inv = admin.get(f"{API}/inventory").json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 10, f"expected 10 after return, got {cur['stock']}"

        # cleanup
        admin.delete(f"{API}/inventory/{iid}")


# ---------------- KELAS CRUD ----------------
class TestKelasCRUD:
    def test_crud(self, admin):
        # list seeded classes
        rows = admin.get(f"{API}/kelas").json()
        assert isinstance(rows, list)

        # create
        payload = {"name": "TEST_KELAS_Z1", "wali_kelas": "Bu Ani", "subjects": ["Matematika", "Fisika"]}
        r = admin.post(f"{API}/kelas", json=payload)
        assert r.status_code == 200, r.text
        k = r.json()
        assert k["name"] == "TEST_KELAS_Z1"
        assert k["subjects"] == ["Matematika", "Fisika"]
        kid = k["id"]

        # update: remove one subject
        r = admin.patch(f"{API}/kelas/{kid}",
                        json={"name": "TEST_KELAS_Z1", "wali_kelas": "Bu Ani", "subjects": ["Matematika"]})
        assert r.status_code == 200
        assert r.json()["subjects"] == ["Matematika"]

        # get to verify
        rows = admin.get(f"{API}/kelas").json()
        found = next(x for x in rows if x["id"] == kid)
        assert found["subjects"] == ["Matematika"]

        # delete
        r = admin.delete(f"{API}/kelas/{kid}")
        assert r.status_code == 200
        rows = admin.get(f"{API}/kelas").json()
        assert not any(x["id"] == kid for x in rows)


# ---------------- QUIZ TEACHER CRUD ----------------
_quiz_id_holder = {}

class TestQuizTeacher:
    def test_create_quiz(self, guru):
        payload = {
            "title": "TEST_Quiz_Bio",
            "kelas": "XI IPA 1",
            "questions": [
                {"q": "2+2?", "options": ["3","4","5","6"], "answer": 1},
                {"q": "Ibukota RI?", "options": ["Bandung","Jakarta","Surabaya","Medan"], "answer": 1},
            ],
        }
        r = guru.post(f"{API}/quizzes", json=payload)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["title"] == "TEST_Quiz_Bio"
        _quiz_id_holder["id"] = q["id"]

    def test_edit_quiz(self, guru):
        qid = _quiz_id_holder["id"]
        payload = {
            "title": "TEST_Quiz_Bio_Edited",
            "kelas": "XI IPA 1",
            "questions": [{"q": "2+2?", "options": ["3","4","5","6"], "answer": 1}],
        }
        r = guru.put(f"{API}/quizzes/{qid}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["title"] == "TEST_Quiz_Bio_Edited"

    def test_delete_quiz(self, guru):
        # create a throwaway
        payload = {"title": "TEST_Quiz_Del", "kelas": "XI IPA 1",
                   "questions": [{"q":"x","options":["a","b"],"answer":0}]}
        qid = guru.post(f"{API}/quizzes", json=payload).json()["id"]
        r = guru.delete(f"{API}/quizzes/{qid}")
        assert r.status_code == 200
        # verify absence
        all_q = guru.get(f"{API}/quizzes").json()
        assert not any(x["id"] == qid for x in all_q)


# ---------------- QUIZ STUDENT VISIBILITY & ATTEMPT ----------------
class TestQuizStudent:
    def test_student_sees_quiz(self, siswa):
        qid = _quiz_id_holder.get("id")
        assert qid, "quiz not created earlier"
        quizzes = siswa.get(f"{API}/quizzes").json()
        assert isinstance(quizzes, list)
        found = [q for q in quizzes if q["id"] == qid]
        assert found, "student cannot see XI IPA 1 quiz"
        # answer field should be stripped
        for q in found[0]["questions"]:
            assert "answer" not in q

    def test_student_attempt(self, siswa):
        qid = _quiz_id_holder["id"]
        # after edit only 1 question with answer index 1
        r = siswa.post(f"{API}/quizzes/attempt", json={"quiz_id": qid, "answers": [1]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total"] == 1
        assert data["score"] == 1
        assert data["percent"] == 100

        # my_attempt appears
        quizzes = siswa.get(f"{API}/quizzes").json()
        q = next(x for x in quizzes if x["id"] == qid)
        assert q.get("my_attempt")
        assert q["my_attempt"]["percent"] == 100

    def test_cleanup_quiz(self, guru):
        qid = _quiz_id_holder.get("id")
        if qid:
            guru.delete(f"{API}/quizzes/{qid}")
