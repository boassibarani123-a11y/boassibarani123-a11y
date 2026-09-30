import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BrainCircuit, Plus, X, Trash2, Pencil, CheckCircle2, Award, Users, ListChecks } from "lucide-react";

export default function Quizzes() {
  const { user } = useAuth();
  const isTeacher = ["guru", "super_admin"].includes(user.role);
  const [list, setList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [taking, setTaking] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const load = () => api.get("/quizzes").then(r => setList(r.data));
  useEffect(() => {
    load();
    api.get("/kelas").then(r => setKelasList(r.data)).catch(() => {});
  }, []);

  const del = async (q) => {
    if (!window.confirm(`Hapus quiz "${q.title}"?`)) return;
    await api.delete(`/quizzes/${q.id}`);
    toast.success("Quiz dihapus"); load();
  };

  const submit = async () => {
    if (answers.some(a => a === -1)) { toast.error("Jawab semua soal dulu ya"); return; }
    const r = await api.post("/quizzes/attempt", { quiz_id: taking.id, answers });
    setResult(r.data);
    toast.success(`Skor: ${r.data.score}/${r.data.total} (${r.data.percent.toFixed(0)}%)`);
    load();
  };

  const closeTaking = () => { setTaking(null); setResult(null); };

  return (
    <div className="space-y-6" data-testid="quizzes-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Mini-Quiz Harian</h1>
          <p className="mt-1 text-sm text-slate-500">Kuis singkat interaktif dengan penilaian otomatis</p>
        </div>
        {isTeacher && (
          <button data-testid="quiz-new-button" onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg shadow-sky-600/30">
            <Plus className="w-4 h-4" />Quiz Baru
          </button>
        )}
      </div>

      {list.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
          <BrainCircuit className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-slate-500">{isTeacher ? "Belum ada quiz. Buat quiz pertamamu!" : "Belum ada quiz untuk kelasmu."}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(q => (
          <div key={q.id} data-testid={`quiz-card-${q.id}`}
            className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-rose-200 transition-all flex flex-col">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <BrainCircuit className="w-5 h-5" />
              </div>
              {isTeacher && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-testid={`quiz-edit-${q.id}`} onClick={() => { setEditing(q); setShowForm(true); }}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700"><Pencil className="w-4 h-4" /></button>
                  <button data-testid={`quiz-delete-${q.id}`} onClick={() => del(q)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            <h3 className="font-heading font-bold text-slate-900 mt-3 text-lg">{q.title}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{(q.questions || []).length} soal</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{q.kelas || "Semua Kelas"}</span>
            </p>

            {isTeacher && (
              <p className="mt-3 text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{q.attempt_count ?? 0} siswa mengerjakan</p>
            )}

            {!isTeacher && (
              <div className="mt-auto pt-4">
                {q.my_attempt ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />Sudah dikerjakan
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-xs text-emerald-700 flex items-center gap-1"><Award className="w-4 h-4" />Skor kamu</span>
                      <span className="font-heading font-extrabold text-emerald-700">{q.my_attempt.score}/{q.my_attempt.total} · {q.my_attempt.percent.toFixed(0)}%</span>
                    </div>
                    <button data-testid={`quiz-retake-${q.id}`} onClick={() => { setResult(null); setTaking(q); setAnswers(Array(q.questions.length).fill(-1)); }}
                      className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">Kerjakan Ulang</button>
                  </div>
                ) : (
                  <button data-testid={`quiz-take-${q.id}`} onClick={() => { setResult(null); setTaking(q); setAnswers(Array(q.questions.length).fill(-1)); }}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">Kerjakan Sekarang</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <QuizModal editing={editing} kelasList={kelasList}
          onClose={() => setShowForm(false)}
          onDone={() => { load(); setShowForm(false); }} />
      )}

      {taking && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" data-testid="quiz-take-modal">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-heading font-bold">{taking.title}</h3>
              <button onClick={closeTaking} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {result ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-sky-600 text-white flex items-center justify-center mx-auto shadow-xl">
                  <Award className="w-10 h-10" />
                </div>
                <div>
                  <p className="font-heading text-4xl font-extrabold text-slate-900">{result.percent.toFixed(0)}%</p>
                  <p className="text-slate-500 mt-1">Kamu menjawab benar {result.score} dari {result.total} soal</p>
                </div>
                <button data-testid="quiz-result-close" onClick={closeTaking} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800">Selesai</button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {taking.questions.map((q, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <p className="font-semibold text-sm mb-2">{i + 1}. {q.q}</p>
                    <div className="space-y-1.5">
                      {q.options.map((o, oi) => (
                        <label key={oi} data-testid={`quiz-opt-${i}-${oi}`}
                          className={`flex items-center gap-2 text-sm p-2.5 rounded-lg cursor-pointer border-2 transition-all ${answers[i] === oi ? "border-sky-500 bg-white" : "border-transparent hover:bg-white"}`}>
                          <input type="radio" checked={answers[i] === oi} onChange={() => { const a = [...answers]; a[i] = oi; setAnswers(a); }} />{o}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button data-testid="quiz-submit-answers" onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800">Kirim Jawaban</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizModal({ editing, kelasList, onClose, onDone }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [kelas, setKelas] = useState(editing?.kelas || "");
  const [qs, setQs] = useState(editing?.questions?.length ? editing.questions.map(q => ({ q: q.q, options: [...q.options], answer: q.answer ?? 0 })) : [{ q: "", options: ["", "", "", ""], answer: 0 }]);
  const [saving, setSaving] = useState(false);

  const add = () => setQs([...qs, { q: "", options: ["", "", "", ""], answer: 0 }]);

  const save = async () => {
    if (!title.trim()) { toast.error("Judul quiz wajib diisi"); return; }
    if (qs.some(q => !q.q.trim() || q.options.some(o => !o.trim()))) { toast.error("Lengkapi semua soal & opsi"); return; }
    setSaving(true);
    const payload = { title: title.trim(), kelas: kelas || "Semua Kelas", questions: qs };
    try {
      if (editing) await api.put(`/quizzes/${editing.id}`, payload);
      else await api.post("/quizzes", payload);
      toast.success(editing ? "Quiz diperbarui" : "Quiz dibuat");
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-500 outline-none";
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl" data-testid="quiz-form-modal">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-heading font-bold">{editing ? "Edit Quiz" : "Buat Quiz"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input data-testid="quiz-title-input" placeholder="Judul quiz" value={title} onChange={e => setTitle(e.target.value)} className={inp} />
          <select data-testid="quiz-kelas-select" value={kelas} onChange={e => setKelas(e.target.value)} className={inp}>
            <option value="">Semua Kelas</option>
            {kelasList.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
          </select>
          {qs.map((q, qi) => (
            <div key={qi} className="p-3 bg-slate-50 rounded-xl space-y-2 relative border border-slate-100">
              {qs.length > 1 && (
                <button onClick={() => setQs(qs.filter((_, i) => i !== qi))} className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
              )}
              <input data-testid={`quiz-q-input-${qi}`} placeholder={`Soal #${qi + 1}`} value={q.q}
                onChange={e => { const c = [...qs]; c[qi].q = e.target.value; setQs(c); }} className="w-full px-3 py-2 border rounded-lg text-sm pr-8" />
              <p className="text-[10px] uppercase font-semibold text-slate-400">Pilih radio = jawaban benar</p>
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.answer === oi} onChange={() => { const c = [...qs]; c[qi].answer = oi; setQs(c); }} />
                  <input placeholder={`Opsi ${oi + 1}`} value={o}
                    onChange={e => { const c = [...qs]; c[qi].options[oi] = e.target.value; setQs(c); }}
                    className={`flex-1 px-2 py-1 border rounded text-sm ${q.answer === oi ? "border-emerald-400 bg-emerald-50" : ""}`} />
                </div>
              ))}
            </div>
          ))}
          <button onClick={add} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:border-sky-500 hover:text-sky-600">+ Tambah Soal</button>
          <button data-testid="quiz-save-button" onClick={save} disabled={saving}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan Quiz"}</button>
        </div>
      </div>
    </div>
  );
}
