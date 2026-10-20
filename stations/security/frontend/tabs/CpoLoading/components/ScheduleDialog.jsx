import { useId, useState } from 'react';
import { FiCalendar, FiClock, FiInfo, FiRotateCcw, FiSave, FiLock } from 'react-icons/fi';
import Dialog from './Dialog.jsx';
import { dateKey, formatDate, scheduleLabel, validateNormal, validateException } from '../loadingModel.js';

const DAYS = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']];

export default function ScheduleDialog({ schedule, initialTab, selectedDate, user, canManage, onSave, onClose }) {
    const today = dateKey();
    const date = selectedDate < today ? today : selectedDate;
    const [tab, setTab] = useState(initialTab || 'special');
    const [normal, setNormal] = useState({ ...schedule.normal, days: [...schedule.normal.days] });
    const makeSpecial = d => ({ date: d, start: schedule.normal.start, end: schedule.normal.end, reason: '', closed: false, ...schedule.exceptions[d] });
    const [special, setSpecial] = useState(() => makeSpecial(date));
    const [error, setError] = useState('');
    const tabId = useId();
    const switchTab = value => { setTab(value); setError(''); };
    const moveTab = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'normal' : event.key === 'End' ? 'special' : tab === 'normal' ? 'special' : 'normal';
        switchTab(next);
        document.getElementById(`${tabId}-${next}`)?.focus();
    };
    const actor = user.full_name || user.fullName || user.name || user.username || 'Manajemen';
    const submit = event => {
        event.preventDefault();
        if (!canManage) return;
        const invalid = tab === 'normal' ? validateNormal(normal) : validateException(special, today);
        if (invalid) { setError(invalid); return; }
        const audit = { updatedBy: actor, updatedAt: new Date().toISOString() };
        const next = tab === 'normal'
            ? { ...schedule, normal: { ...normal, ...audit } }
            : { ...schedule, exceptions: { ...schedule.exceptions, [special.date]: { ...special, reason: special.reason.trim(), ...audit } } };
        if (onSave(next)) onClose();
        else setError('Penyimpanan browser tidak tersedia. Draf belum disimpan.');
    };
    const removeSpecial = () => {
        const exceptions = { ...schedule.exceptions };
        delete exceptions[special.date];
        if (onSave({ ...schedule, exceptions })) onClose();
        else setError('Draf belum dapat dihapus dari penyimpanan browser.');
    };
    return <Dialog title="Jadwal operasional" eyebrow="PENGATURAN CPO LOADING" onClose={onClose}>
        <div className="cpo-dialog-tabs" role="tablist" aria-label="Jenis jadwal" onKeyDown={moveTab}>
            <button id={`${tabId}-normal`} type="button" role="tab" aria-controls={`${tabId}-panel`} tabIndex={tab === 'normal' ? 0 : -1} aria-selected={tab === 'normal'} onClick={() => switchTab('normal')}><FiClock />Jadwal normal</button>
            <button id={`${tabId}-special`} type="button" role="tab" aria-controls={`${tabId}-panel`} tabIndex={tab === 'special' ? 0 : -1} aria-selected={tab === 'special'} onClick={() => switchTab('special')}><FiCalendar />Jadwal khusus</button>
        </div>
        <form onSubmit={submit}>
            <div id={`${tabId}-panel`} className="cpo-form-content" role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
                <div className="cpo-notice cpo-notice--blue"><FiInfo /><p><strong>Draf pengaturan UI</strong>Disimpan hanya di browser dan akun ini. Jadwal ini belum mengubah alarm, model AI, atau pengaturan pengguna lain.</p></div>
                {!canManage && <div className="cpo-notice"><FiLock /><p>Anda dapat melihat jadwal. Perubahan jadwal hanya untuk manajemen.</p></div>}
                <fieldset disabled={!canManage}>
                    {tab === 'normal' ? <>
                        <div className="cpo-form-intro"><h3>Jam kerja yang berlaku rutin</h3><p>Perubahan jadwal normal berlaku seterusnya sampai manajemen mengubahnya kembali.</p></div>
                        <div className="cpo-time-fields"><label>Jam mulai<input required type="time" value={normal.start} onChange={event => setNormal({ ...normal, start: event.target.value })} /></label><span>—</span><label>Jam selesai<input required type="time" value={normal.end} onChange={event => setNormal({ ...normal, end: event.target.value })} /></label><span className="cpo-timezone">WIB</span></div>
                        {normal.start > normal.end && <p className="cpo-form-hint">Jadwal lintas hari: selesai pada hari berikutnya.</p>}
                        <label className="cpo-field-label">Hari operasional</label>
                        <div className="cpo-day-picker">{DAYS.map(([day, label]) => <button key={day} type="button" aria-pressed={normal.days.includes(day)} onClick={() => setNormal({ ...normal, days: normal.days.includes(day) ? normal.days.filter(d => d !== day) : [...normal.days, day] })}>{label}</button>)}</div>
                        <p className="cpo-form-hint">Hari tanpa pilihan dianggap tidak beroperasi. Default awal: setiap hari, 07.00–17.00 WIB.</p>
                    </> : <>
                        <div className="cpo-form-intro"><h3>Pengecualian untuk satu tanggal</h3><p>Untuk kedatangan terlambat, perpanjangan jam, atau penutupan sementara. Tidak mengubah jadwal normal.</p></div>
                        <label>Tanggal berlaku<input required type="date" min={today} value={special.date} onChange={event => { setSpecial(makeSpecial(event.target.value)); setError(''); }} /></label>
                        <label className="cpo-checkbox"><input type="checkbox" checked={special.closed} onChange={event => setSpecial({ ...special, closed: event.target.checked })} /><span>Area tidak beroperasi pada tanggal ini</span></label>
                        {!special.closed && <div className="cpo-time-fields"><label>Jam mulai<input required type="time" value={special.start} onChange={event => setSpecial({ ...special, start: event.target.value })} /></label><span>—</span><label>Jam selesai<input required type="time" value={special.end} onChange={event => setSpecial({ ...special, end: event.target.value })} /></label><span className="cpo-timezone">WIB</span></div>}
                        <label>Alasan perubahan <span className="cpo-required">*</span><textarea required maxLength={300} rows={3} placeholder="Contoh: kedatangan truk terlambat, loading diperpanjang hingga 21.00 WIB." value={special.reason} onChange={event => setSpecial({ ...special, reason: event.target.value })} /></label>
                        <div className="cpo-return-note"><FiRotateCcw /><div><strong>Kembali otomatis ke jadwal normal</strong><span>Setelah {special.date ? formatDate(special.date) : 'tanggal tersebut'}, tanggal berikutnya kembali memakai jadwal normalnya, kecuali memiliki pengecualian tersendiri.</span></div></div>
                    </>}
                </fieldset>
                {tab === 'special' && schedule.exceptions[special.date] && <div className="cpo-existing-exception"><div><strong>Draf khusus sudah tersimpan</strong><span>{scheduleLabel({ ...schedule.exceptions[special.date], open: !schedule.exceptions[special.date].closed })} · {schedule.exceptions[special.date].updatedBy || 'Manajemen'}</span></div>{canManage && <button type="button" className="cpo-text-button cpo-danger-text" onClick={removeSpecial}>Hapus pengecualian</button>}</div>}
                {error && <p className="cpo-form-error" role="alert">{error}</p>}
            </div>
            <footer className="cpo-dialog-footer"><span>Zona waktu: Asia/Jakarta</span><div><button type="button" className="cpo-button" onClick={onClose}>Tutup</button>{canManage && <button type="submit" className="cpo-button cpo-button--primary"><FiSave />Simpan draf</button>}</div></footer>
        </form>
    </Dialog>;
}
