import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { School, Plus, X, Trash2, Pencil, BookOpen, Users, UserCog, CalendarClock, Star } from "lucide-react";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function Kelas() {
  const { user } = useAuth();
  const canEdit = ["super_admin", "staff_tu", "kepsek"].includes(user.role);
  const [list, setList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);

  const load = () => api.get("/kelas").then(r => setList(r.data));
  useEffect(() => {
    load();
    if (canEdit) api.get("/users?role=guru").then(r => setTeachers(r.data)).catch(() => {});
  }, [canEdit]);

  const del = async (k) => {
    if (!window.confirm(`Hapus kelas "${k.name}"?`)) return;
    await api.delete(`/kelas/${k.id}`);
    toast.success("Kelas dihapus"); load();
  };

  // Sort: siswa's own class first
  const ordered = [...list].sort((a, b) =>
    (b.name === user.kelas ? 1 : 0) - (a.name === user.kelas ? 1 : 0));

  return (
    <div className="space-y-6" data-testid="kelas-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <School className="w-7 h-7 text-sky-600" />Manajemen Kelas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {canEdit ? "Kelola kelas, wali kelas, mata pelajaran, dan jadwal mingguan."
              : "Lihat mata pelajaran dan jadwal pelajaran mingguan kelasmu."}
          </p>
        </div>
        {canEdit && (
          <button data-testid="kelas-add-button" onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg shadow-sky-600/30">
            <Plus className="w-4 h-4" />Tambah Kelas
          </button>
        )}
      </div>

      {list.length === 0 && <p className="text-slate-400 italic">Belum ada kelas.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ordered.map(k => {
          const mine = k.name === user.kelas;
          return (
            <div key={k.id} data-testid={`kelas-card-${k.id}`}
              className={`group bg-white border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all ${mine ? "border-sky-400 ring-2 ring-sky-200" : "border-slate-200 hover:border-sky-300"}`}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shadow-lg shadow-sky-600/30">
                  <School className="w-6 h-6" />
                </div>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button data-testid={`kelas-edit-${k.id}`} onClick={() => { setEditing(k); setShowForm(true); }}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700"><Pencil className="w-4 h-4" /></button>
                    <button data-testid={`kelas-delete-${k.id}`} onClick={() => del(k)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <h3 className="font-heading text-xl font-extrabold text-slate-900 mt-4 flex items-center gap-2">
                {k.name}
                {mine && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold"><Star className="w-3 h-3" />Kelasku</span>}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><UserCog className="w-3.5 h-3.5" />{k.wali_kelas || "Belum ada wali"}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{k.student_count} siswa</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5" />{(k.subjects || []).length} Mata Pelajaran
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(k.subjects || []).length === 0 && <span className="text-xs text-slate-400 italic">Belum ada mapel</span>}
                  {(k.subjects || []).map((s, i) => (
                    <span key={i} className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-100">{s}</span>
                  ))}
                </div>
              </div>
              <button data-testid={`kelas-schedule-${k.id}`} onClick={() => setScheduleFor(k)}
                className="mt-4 w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 flex items-center justify-center gap-2">
                <CalendarClock className="w-4 h-4" />Lihat Jadwal ({(k.schedule || []).length})
              </button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <KelasForm editing={editing} teachers={teachers}
          onClose={() => setShowForm(false)}
          onDone={() => { load(); setShowForm(false); }} />
      )}
      {scheduleFor && (
        <ScheduleView kelas={scheduleFor} onClose={() => setScheduleFor(null)} />
      )}
    </div>
  );
}

function ScheduleView({ kelas, onClose }) {
  const sched = kelas.schedule || [];
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} data-testid="schedule-view-modal">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2"><CalendarClock className="w-5 h-5 text-sky-600" />Jadwal {kelas.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {sched.length === 0 && <p className="text-slate-400 italic text-sm">Belum ada jadwal untuk kelas ini.</p>}
          {DAYS.map(day => {
            const items = sched.filter(s => s.day === day).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
            if (items.length === 0) return null;
            return (
              <div key={day}>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-2">{day}</p>
                <div className="space-y-2">
                  {items.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-mono-alt text-xs font-bold text-slate-700 w-24 shrink-0">{s.time || "--"}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{s.subject}</p>
                        <p className="text-[11px] text-slate-500 truncate">{s.teacher || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KelasForm({ editing, teachers, onClose, onDone }) {
  const [name, setName] = useState(editing?.name || "");
  const [wali, setWali] = useState(editing?.wali_kelas || "");
  const [subjects, setSubjects] = useState(editing?.subjects || []);
  const [schedule, setSchedule] = useState(editing?.schedule || []);
  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    if (subjects.includes(v)) { toast.error("Mapel sudah ada"); return; }
    setSubjects([...subjects, v]); setNewSub("");
  };
  const removeSub = (s) => setSubjects(subjects.filter(x => x !== s));

  const addRow = () => setSchedule([...schedule, { day: "Senin", time: "", subject: subjects[0] || "", teacher: wali || "" }]);
  const updateRow = (i, field, val) => { const c = [...schedule]; c[i] = { ...c[i], [field]: val }; setSchedule(c); };
  const removeRow = (i) => setSchedule(schedule.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim()) { toast.error("Nama kelas wajib diisi"); return; }
    setSaving(true);
    const payload = { name: name.trim(), wali_kelas: wali || null, subjects, schedule };
    try {
      if (editing) await api.patch(`/kelas/${editing.id}`, payload);
      else await api.post("/kelas", payload);
      toast.success(editing ? "Kelas diperbarui" : "Kelas ditambahkan");
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-500 outline-none text-sm";
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" data-testid="kelas-form-modal">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="font-heading font-bold text-lg">{editing ? "Edit Kelas" : "Tambah Kelas"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Nama Kelas</label>
            <input data-testid="kelas-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="XI IPA 1" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Wali Kelas</label>
            <select data-testid="kelas-wali-select" value={wali} onChange={e => setWali(e.target.value)} className={inp}>
              <option value="">— Belum ditentukan —</option>
              {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Mata Pelajaran</label>
            <div className="mt-1.5 flex gap-2">
              <input data-testid="kelas-subject-input" value={newSub} onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                placeholder="Tambah mapel lalu Enter" className={inp} />
              <button data-testid="kelas-subject-add" onClick={addSub} className="px-4 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 shrink-0">+</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjects.length === 0 && <span className="text-xs text-slate-400 italic">Belum ada mapel ditambahkan</span>}
              {subjects.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                  {s}
                  <button onClick={() => removeSub(s)} className="p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />Jadwal Mingguan</label>
              <button data-testid="kelas-schedule-add-row" onClick={addRow} className="text-xs font-semibold text-sky-600 hover:text-sky-800">+ Tambah Sesi</button>
            </div>
            <div className="mt-2 space-y-2">
              {schedule.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada sesi jadwal.</p>}
              {schedule.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center" data-testid={`kelas-schedule-row-${i}`}>
                  <select value={row.day} onChange={e => updateRow(i, "day", e.target.value)} className="col-span-3 px-2 py-1.5 border rounded text-xs">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input value={row.time} onChange={e => updateRow(i, "time", e.target.value)} placeholder="07:00-08:30" className="col-span-3 px-2 py-1.5 border rounded text-xs" />
                  <select value={row.subject} onChange={e => updateRow(i, "subject", e.target.value)} className="col-span-3 px-2 py-1.5 border rounded text-xs">
                    <option value="">Mapel</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={row.teacher} onChange={e => updateRow(i, "teacher", e.target.value)} className="col-span-2 px-2 py-1.5 border rounded text-xs">
                    <option value="">Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                  <button onClick={() => removeRow(i)} className="col-span-1 text-rose-500 hover:text-rose-700 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <button data-testid="kelas-save-button" onClick={save} disabled={saving}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Kelas"}
          </button>
        </div>
      </div>
    </div>
  );
}
