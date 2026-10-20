import { useState } from 'react';
import { FiClock, FiMapPin, FiCheckCircle, FiAlertTriangle, FiTruck, FiInfo } from 'react-icons/fi';
import Dialog from './Dialog.jsx';
import CameraScene from './CameraScene.jsx';
import { durationMinutes, formatDate, formatDuration, formatTime, dateKey, isOperational } from '../loadingModel.js';

export default function EventDetailsDialog({ visit, schedule, now, review, canManage, onReview, onClose }) {
    const [note, setNote] = useState(''), [disposition, setDisposition] = useState('follow_up'), [error, setError] = useState('');
    const outside = !isOperational(visit.enteredAt, schedule);
    const submit = event => {
        event.preventDefault();
        if (!note.trim()) { setError('Tambahkan catatan hasil tinjauan.'); return; }
        onReview({ note: note.trim(), disposition, at: new Date().toISOString() });
    };
    return <Dialog title={visit.plate || 'Identitas truk belum terbaca'} eyebrow={`DETAIL KUNJUNGAN · ${visit.id}`} wide onClose={onClose}>
        <div className="cpo-detail-grid">
            <div><div className="cpo-detail-image"><CameraScene compact /><span className="cpo-image-disclaimer">Ilustrasi contoh · bukan bukti kejadian</span><span className="cpo-detail-image-time">{formatDate(dateKey(visit.enteredAt))} · {formatTime(visit.enteredAt)} WIB</span></div>
                <div className="cpo-detail-facts"><span><FiMapPin />{visit.zone}</span><span><FiTruck />ID pelacakan: {visit.id.split('-').at(-1)}</span><span>Keyakinan deteksi contoh: {visit.confidence}%</span></div>
                <div className="cpo-notice"><FiInfo /><p>Plat, waktu, dan hasil deteksi pada dialog ini adalah data contoh. Durasi pengisian membutuhkan validasi aktivitas pengisian; durasi area dihitung dari masuk hingga keluar.</p></div>
            </div>
            <div><div className={`cpo-event-classification ${outside ? 'is-outside' : ''}`}>{outside ? <FiAlertTriangle /> : <FiCheckCircle />}<div><strong>{outside ? 'Aktivitas di luar jadwal' : 'Aktivitas dalam jadwal'}</strong><span>{outside ? 'Perlu verifikasi petugas; bukan kesimpulan pencurian.' : 'Klasifikasi pratinjau berdasarkan draf jadwal.'}</span></div></div>
                <div className="cpo-detail-duration"><div><span>Durasi di area</span><strong>{formatDuration(durationMinutes(visit.enteredAt, visit.exitedAt || now))}</strong></div><div><span>Durasi pengisian</span><strong>{formatDuration(durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt || (!visit.exitedAt ? now : null)))}</strong></div></div>
                <ol className="cpo-event-timeline">{[['Terdeteksi masuk', visit.enteredAt], ['Pengisian dimulai', visit.loadingStartedAt], ['Pengisian selesai', visit.loadingEndedAt], ['Terdeteksi keluar', visit.exitedAt]].map(([label, time]) => <li key={label} className={time ? 'is-recorded' : ''}><i /><div><strong>{label}</strong><span>{time ? `${formatTime(time)} WIB` : 'Belum tercatat'}</span></div></li>)}</ol>
                <p className="cpo-detail-description">{visit.note}</p>
                {review ? <div className="cpo-review-result"><FiCheckCircle /><div><strong>Ditinjau · {review.disposition === 'authorized' ? 'Kegiatan terkonfirmasi sah' : 'Perlu tindak lanjut'}</strong><p>{review.note}</p><small>Catatan contoh pada sesi pratinjau ini.</small></div></div> : outside && canManage ? <form className="cpo-review-form" onSubmit={submit}><h3>Tinjau kejadian contoh</h3><label>Hasil tinjauan<select value={disposition} onChange={event => setDisposition(event.target.value)}><option value="follow_up">Perlu tindak lanjut</option><option value="authorized">Kegiatan terkonfirmasi sah</option></select></label><label>Catatan manajemen<textarea required maxLength={300} rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Tuliskan hasil pemeriksaan atau referensi izin..." /></label>{error && <p role="alert" className="cpo-form-error">{error}</p>}<button type="submit" className="cpo-button cpo-button--primary"><FiCheckCircle />Simpan tinjauan contoh</button></form> : outside ? <p className="cpo-form-hint">Tinjauan manajemen belum tersedia untuk akun ini.</p> : null}
            </div>
        </div>
        <footer className="cpo-dialog-footer"><span><FiClock />Seluruh waktu dalam WIB</span><button type="button" className="cpo-button" onClick={onClose}>Tutup detail</button></footer>
    </Dialog>;
}
