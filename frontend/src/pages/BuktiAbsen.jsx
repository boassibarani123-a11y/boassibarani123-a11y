import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { ShieldCheck, RefreshCw, CalendarDays, Camera, Info } from "lucide-react";

const STATUS_STYLE = {
  hadir: "bg-emerald-100 text-emerald-700",
  izin: "bg-sky-100 text-sky-700",
  sakit: "bg-amber-100 text-amber-700",
  alpa: "bg-rose-100 text-rose-700",
};

export default function BuktiAbsen() {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/attendance/proofs${date ? `?date=${date}` : ""}`)
      .then(r => setRows(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  return (
    <div className="space-y-6" data-testid="bukti-absen-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-sky-600" />Bukti Absen
          </h1>
          <p className="mt-1 text-sm text-slate-500">Foto otomatis tertangkap saat siswa scan QR — anti-titip absen.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input data-testid="bukti-date-filter" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm" />
          </div>
          <button data-testid="bukti-refresh" onClick={load}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Demi menjaga performa server, bukti foto <b>otomatis dihapus setelah 2 hari</b> (auto-recycle).</span>
      </div>

      {loading ? (
        <p className="text-slate-400 italic">Memuat bukti absen…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
          <Camera className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-slate-500">Belum ada bukti foto untuk tanggal ini.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="bukti-grid">
          {rows.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button onClick={() => setPreview(r)} className="block w-full aspect-square bg-slate-100 overflow-hidden">
                <img src={r.photo} alt={r.student_name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </button>
              <div className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-slate-900 truncate">{r.student_name}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${STATUS_STYLE[r.status] || "bg-slate-100 text-slate-700"}`}>{r.status}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{r.kelas || "-"} · {new Date(r.captured_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Petugas: {r.scanned_by || "-"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={preview.photo} alt={preview.student_name} className="w-full max-h-[70vh] object-contain bg-slate-950" />
            <div className="p-4">
              <p className="font-heading font-bold text-slate-900">{preview.student_name}</p>
              <p className="text-sm text-slate-500">{preview.kelas || "-"} · {preview.status?.toUpperCase()} · {new Date(preview.captured_at).toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
