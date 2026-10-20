import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiArrowRight, FiArrowUpRight, FiCalendar, FiCamera, FiCheckCircle, FiChevronRight, FiClock, FiCpu, FiDownload, FiEye, FiFileText, FiGrid, FiInfo, FiList, FiSearch, FiSettings, FiShield, FiTruck, FiAlertTriangle, FiX } from 'react-icons/fi';
import LoadingCamera from './components/LoadingCamera.jsx';
import CameraScene from './components/CameraScene.jsx';
import ScheduleDialog from './components/ScheduleDialog.jsx';
import EventDetailsDialog from './components/EventDetailsDialog.jsx';
import { demoVisits, DEMO_TIME } from './demoData.js';
import { cameraCandidates, canManageSchedule, csvReport, dateKey, durationMinutes, formatDate, formatDuration, formatTime, isOperational, normalizeSchedule, operationalWindows, planForDate, recommendedCamera, scheduleLabel, STATE_LABELS, summarize, visitState, wibParts } from './loadingModel.js';
import './CpoLoading.css';

const readStored = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };

function Metric({ icon: Icon, label, value, detail, tone = '', suffix }) {
    return <article className={`cpo-metric ${tone}`}><div className="cpo-metric-heading"><span>{label}</span><i><Icon /></i></div><div className="cpo-metric-value">{value}{suffix && <small>{suffix}</small>}</div><p>{detail}</p></article>;
}

function ScheduleCard({ schedule, selectedDate, now, demo, onEdit, canManage }) {
    const plan = planForDate(schedule, selectedDate), minute = wibParts(now).minute;
    const current = demo || selectedDate === dateKey();
    const open = isOperational(now, schedule);
    const bands = operationalWindows(schedule, selectedDate);
    const displayPlan = !plan.open && bands.length ? { ...plan, open: true, start: bands[0][0], end: bands[0][1] } : plan;
    const position = time => (Number(time.slice(0, 2)) * 60 + Number(time.slice(3))) / 1440 * 100;
    return <section className="cpo-panel cpo-schedule-card">
        <header className="cpo-panel-header"><div className="cpo-section-label"><FiClock /><h2>Jam operasional</h2></div><button className="cpo-icon-button" type="button" onClick={() => onEdit('normal')} aria-label="Lihat atau ubah jadwal normal"><FiSettings /></button></header>
        <div className="cpo-schedule-body"><div className="cpo-schedule-label"><span>{selectedDate === dateKey() ? 'JADWAL HARI INI' : 'JADWAL TANGGAL TERPILIH'}</span><span className={`cpo-badge ${plan.special ? 'amber' : 'neutral'}`}>{plan.special ? 'Khusus · draf' : 'Normal · draf'}</span></div>
            <strong className="cpo-operating-hours">{scheduleLabel(displayPlan).replace(' WIB', '')}<small>{displayPlan.open && 'WIB'}</small></strong>
            {current && <span className={`cpo-hours-state ${open ? 'is-open' : ''}`}><i />{open ? 'Dalam jam operasional' : 'Di luar jam operasional'}{demo && ' · contoh'}</span>}
            <div className="cpo-dayline"><div className="cpo-dayline-track">{bands.map(([start, end]) => <span key={start} className={plan.special ? 'is-special' : ''} style={{ left: `${position(start)}%`, width: `${position(end) - position(start)}%` }} />)}{current && <i style={{ left: `${minute / 1440 * 100}%` }} title={`Penunjuk waktu ${formatTime(now)} WIB`} />}</div><div className="cpo-dayline-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
            <div className="cpo-schedule-normal"><span>Jadwal normal</span><strong>{schedule.normal.start.replace(':', '.')}–{schedule.normal.end.replace(':', '.')} WIB</strong></div>
            {plan.special ? <div className="cpo-special-note"><FiCalendar /><p><strong>Hanya {formatDate(selectedDate)}</strong>{plan.reason}<span>Tanggal berikutnya memakai jadwal normal, kecuali ada pengecualian lain.</span></p></div> : <p className="cpo-muted cpo-schedule-caption">{schedule.normal.days.length === 7 ? 'Berlaku setiap hari.' : `${schedule.normal.days.length} hari operasional per minggu.`} Pengecualian tanggal tidak mengubah jadwal normal.</p>}
            <button type="button" className="cpo-button cpo-schedule-action" onClick={() => onEdit('special')}><FiCalendar />{canManage ? 'Atur jadwal khusus' : 'Lihat pengaturan jadwal'}<FiArrowUpRight /></button>
            <span className="cpo-draft-caption">Draf browser · belum diterapkan ke sistem AI</span>
        </div>
    </section>;
}

function HourlyChart({ visits }) {
    const hours = [0, 4, 8, 12, 16, 20];
    const counts = hours.map(hour => visits.filter(visit => { const h = Math.floor(wibParts(visit.enteredAt).minute / 60); return h >= hour && h < hour + 4; }).length);
    const peak = Math.max(1, ...counts);
    return <div className="cpo-hourly-chart" aria-label="Jumlah kunjungan per empat jam dalam data contoh">{hours.map((hour, index) => <div key={hour}><span>{counts[index] || ''}</span><i><b style={{ height: `${Math.max(4, counts[index] / peak * 100)}%` }} /></i><small>{String(hour).padStart(2, '0')}</small></div>)}</div>;
}

export default function CpoLoadingTab({ cctvCameras = [], user = {} }) {
    const identity = user.id || user.userId || user.username || 'local';
    const storageKey = `mewah.cpo-loading.draft.v1.${identity}`;
    const cameraKey = `mewah.cpo-loading.camera.v1.${identity}`;
    const [schedule, setSchedule] = useState(() => normalizeSchedule(readStored(storageKey)));
    const [cameraId, setCameraId] = useState(() => String(readStored(cameraKey) || ''));
    const [demo, setDemo] = useState(false), [selectedDate, setSelectedDate] = useState(dateKey());
    const [now, setNow] = useState(() => new Date()), [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
    const [captureLayout, setCaptureLayout] = useState('grid'), [scheduleTab, setScheduleTab] = useState(null);
    const [selectedVisit, setSelectedVisit] = useState(null), [reviews, setReviews] = useState({}), [message, setMessage] = useState('');
    const tableRef = useRef(null), lastToday = useRef(dateKey());
    const canManage = canManageSchedule(user);
    const candidates = useMemo(() => cameraCandidates(cctvCameras), [cctvCameras]);
    const suggested = recommendedCamera(candidates);
    const camera = candidates.find(item => String(item.id) === cameraId) || (!cameraId ? suggested : null);
    useEffect(() => {
        const timer = setInterval(() => {
            const next = new Date(), today = dateKey(next), previous = lastToday.current;
            setNow(next);
            if (today !== previous) { lastToday.current = today; setSelectedDate(date => date === previous ? today : date); }
        }, 15000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!message) return undefined;
        const timer = setTimeout(() => setMessage(''), 6500);
        return () => clearTimeout(timer);
    }, [message]);
    const selectedNow = demo ? new Date(`${selectedDate}T${DEMO_TIME}:00+07:00`) : now;
    const visits = useMemo(() => demo ? demoVisits(selectedDate) : [], [demo, selectedDate]);
    const summary = useMemo(() => summarize(visits, schedule, selectedDate, selectedNow), [visits, schedule, selectedDate, selectedNow]);
    const outsideVisits = summary.visits.filter(visit => !isOperational(visit.enteredAt, schedule));
    const unreviewed = outsideVisits.filter(visit => !reviews[visit.id]);
    const filtered = summary.visits.filter(visit => {
        const matches = `${visit.plate || ''} ${visit.id}`.toLowerCase().includes(query.toLowerCase().trim());
        return matches && (filter === 'all' || filter === 'outside' && !isOperational(visit.enteredAt, schedule) || filter === 'active' && !visit.exitedAt || filter === 'completed' && !!visit.exitedAt);
    }).sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt));
    const captures = [...summary.visits].sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt)).slice(0, 4);
    const changeMode = value => { setDemo(value); setFilter('all'); setQuery(''); setSelectedVisit(null); };
    const saveSchedule = next => {
        if (!canManage) return false;
        try { localStorage.setItem(storageKey, JSON.stringify(next)); setSchedule(next); setMessage('Draf jadwal disimpan di browser ini. Belum diterapkan ke alarm atau pengguna lain.'); return true; }
        catch { return false; }
    };
    const chooseCamera = event => {
        setCameraId(event.target.value);
        try { localStorage.setItem(cameraKey, JSON.stringify(event.target.value)); }
        catch { setMessage('Kamera dipilih untuk sesi ini; preferensi tidak dapat disimpan.'); }
    };
    const exportCsv = () => {
        const url = URL.createObjectURL(new Blob([csvReport(filtered, schedule)], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a'); link.href = url; link.download = `cpo-loading-CONTOH-${selectedDate}.csv`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('CSV data contoh diekspor sesuai filter yang dipilih.');
    };
    const reviewEvents = () => { setFilter('outside'); setQuery(''); tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const tableFilters = [['all', 'Semua', summary.visits.length], ['outside', 'Di luar jadwal', summary.outside], ['active', 'Di area', summary.active], ['completed', 'Selesai', summary.visits.filter(visit => visit.exitedAt).length]];
    return <div className="cpo-loading">
        <header className="cpo-page-heading"><div><div className="cpo-eyebrow"><FiCpu />AI VISION <span>/</span> OIL DISPATCH</div><h1>CPO Loading <span className="cpo-design-tag">Rancangan UI</span></h1><p>Pantau aktivitas truk, pengisian CPO, dan kejadian di luar jadwal.</p></div><div className="cpo-page-actions"><button type="button" className="cpo-button" disabled={!demo || !filtered.length} onClick={exportCsv} title={!demo ? 'Data AI belum tersedia untuk diekspor' : 'Ekspor data contoh sesuai filter'}><FiDownload />Ekspor CSV</button><button type="button" className="cpo-button cpo-button--primary" onClick={() => setScheduleTab('normal')}><FiSettings />{canManage ? 'Atur jadwal' : 'Lihat jadwal'}</button></div></header>

        <div className="cpo-view-toolbar"><div className="cpo-mode-switch" aria-label="Sumber tampilan"><button type="button" aria-pressed={!demo} onClick={() => changeMode(false)}><FiCamera />Live CCTV</button><button type="button" aria-pressed={demo} onClick={() => changeMode(true)}><FiGrid />Data contoh</button></div><div className="cpo-date-control"><span>Tanggal aktivitas</span><label><FiCalendar /><input aria-label="Tanggal aktivitas" type="date" value={selectedDate} onChange={event => { if (event.target.value) { setSelectedDate(event.target.value); setFilter('all'); setQuery(''); } }} /></label>{selectedDate !== dateKey() && <button type="button" className="cpo-text-button" onClick={() => setSelectedDate(dateKey())}>Hari ini</button>}<span className="cpo-timezone">WIB</span></div></div>

        <div className={`cpo-mode-notice ${demo ? 'is-demo' : ''}`}><FiInfo /><p>{demo ? <><strong>Data contoh.</strong> Simulasi aktivitas pukul {DEMO_TIME.replace(':', '.')} WIB. Gambar adalah ilustrasi; tidak memicu alarm atau mencatat kejadian nyata.</> : <><strong>Menunggu integrasi AI.</strong> CCTV dapat dipantau. Hitungan truk, capture otomatis, dan alarm belum menghasilkan data nyata.</>}</p>{!demo && <button type="button" onClick={() => changeMode(true)}>Lihat contoh tampilan <FiArrowRight /></button>}</div>

        <section className="cpo-metrics" aria-label="Ringkasan aktivitas tanggal terpilih"><Metric icon={FiTruck} label="Truk masuk" value={demo ? summary.admitted : '—'} suffix={demo ? 'truk' : null} detail={demo ? `Dalam jam operasional · ${summary.visits.length} kunjungan keseluruhan` : 'Menunggu hasil deteksi AI'} /><Metric icon={FiActivity} label="Sedang di area" value={demo ? summary.active : '—'} suffix={demo ? 'truk' : null} detail={demo ? 'Sesi aktif · termasuk antre di zona loading' : 'Status aktivitas belum tersedia'} /><Metric icon={FiClock} label="Rerata pengisian" value={demo && summary.average !== null ? summary.average : '—'} suffix={demo && summary.average !== null ? 'menit' : null} detail={demo ? `Dari ${summary.completedFillings} sesi pengisian selesai` : 'Dihitung dari pengisian terkonfirmasi'} /><Metric icon={FiAlertTriangle} label="Di luar jadwal" value={demo ? summary.outside : '—'} suffix={demo ? 'kejadian' : null} detail={demo ? `${unreviewed.length} belum ditinjau · perlu verifikasi` : 'Belum ada data untuk dinilai'} tone="cpo-metric--warning" /></section>

        <div className="cpo-monitoring-grid"><div className="cpo-primary-column"><div className="cpo-camera-selector"><div><FiCamera /><label htmlFor="cpo-camera-select">Sumber kamera</label></div><select id="cpo-camera-select" value={camera ? String(camera.id) : cameraId} onChange={chooseCamera} disabled={demo}><option value="">{suggested ? `Otomatis · ${suggested.camera_name}` : 'Pilih kamera CCTV'}</option>{cameraId && !camera && <option value={cameraId}>Kamera #{cameraId} tidak tersedia</option>}{candidates.map(item => <option key={item.id} value={String(item.id)}>{item.camera_name} · #{item.id}</option>)}</select></div><LoadingCamera key={`${demo}-${camera?.id || 'none'}`} demo={demo} camera={camera} time={formatTime(demo ? selectedNow : now)} onMessage={setMessage} />
            <div className="cpo-camera-legend"><span><i />{demo ? 'Zona pengamatan contoh' : 'Kalibrasi zona diperlukan sebelum deteksi'}</span><span>{demo ? 'Identitas dan aktivitas pada data ini adalah simulasi' : 'CCTV selalu menampilkan kondisi saat ini'}</span></div>
        </div><aside className="cpo-secondary-column"><ScheduleCard schedule={schedule} selectedDate={selectedDate} now={selectedNow} demo={demo} canManage={canManage} onEdit={setScheduleTab} />
            {demo ? <section className="cpo-attention-card"><div><span className="cpo-attention-icon"><FiShield /></span><span className="cpo-eyebrow">TINJAUAN KEAMANAN · CONTOH</span></div><h3>{unreviewed.length ? `${unreviewed.length} kejadian perlu ditinjau` : 'Kejadian contoh sudah ditinjau'}</h3><p>Aktivitas di luar jadwal memerlukan pemeriksaan. Deteksi tidak langsung menyimpulkan adanya pencurian.</p><button type="button" onClick={reviewEvents}>Tinjau kejadian <FiArrowRight /></button></section> : <section className="cpo-panel cpo-ai-readiness"><div className="cpo-section-label"><FiCpu /><h2>Kesiapan pemantauan</h2></div><div><span>Deteksi truk</span><span className="cpo-badge neutral">Belum terhubung</span></div><div><span>Zona loading</span><span className="cpo-muted">Belum dikalibrasi</span></div><div><span>Capture & alarm</span><span className="cpo-muted">Belum aktif</span></div></section>}
        </aside></div>

        <section className="cpo-panel cpo-captures"><header className="cpo-panel-header"><div className="cpo-section-label"><FiCamera /><h2>Recent capture</h2><span className="cpo-count">{captures.length}</span></div><div className="cpo-capture-tools"><span>{demo ? 'Ilustrasi data contoh' : 'Capture otomatis dari AI'}</span><div role="group" aria-label="Tampilan capture"><button type="button" className="cpo-icon-button" aria-label="Capture dalam grid" aria-pressed={captureLayout === 'grid'} onClick={() => setCaptureLayout('grid')}><FiGrid /></button><button type="button" className="cpo-icon-button" aria-label="Capture dalam daftar" aria-pressed={captureLayout === 'list'} onClick={() => setCaptureLayout('list')}><FiList /></button></div></div></header>
            {demo ? <div className={`cpo-capture-grid ${captureLayout === 'list' ? 'is-list' : ''}`}>{captures.map(visit => <button type="button" key={visit.id} className="cpo-capture-card" onClick={() => setSelectedVisit(visit)}><div className="cpo-capture-picture"><CameraScene compact /><span className="cpo-capture-label">ILUSTRASI</span><span className="cpo-capture-stamp">{formatTime(visit.enteredAt)} WIB</span><i><FiEye /></i></div><div className="cpo-capture-card-body"><strong>{visit.plate || 'Identitas belum terbaca'}<FiArrowUpRight /></strong><span>{visit.zone} <i>·</i> {STATE_LABELS[visitState(visit)]}</span></div></button>)}</div> : <div className="cpo-empty-captures"><span className="cpo-empty-icon"><FiCamera /></span><div><strong>Capture otomatis belum tersedia</strong><p>Bukti gambar akan tampil di sini setelah AI terhubung dan merekam aktivitas.</p></div><button type="button" className="cpo-text-button" onClick={() => changeMode(true)}>Lihat data contoh <FiArrowRight /></button></div>}
        </section>

        <section ref={tableRef} className="cpo-panel cpo-visits"><header className="cpo-panel-header"><div className="cpo-section-label"><FiFileText /><h2>Aktivitas truk</h2><span className="cpo-count">{demo ? summary.visits.length : '—'}</span></div><span className="cpo-table-date">{formatDate(selectedDate)} <span>· WIB</span></span></header>
            <div className="cpo-table-toolbar"><div className="cpo-table-filters" role="group" aria-label="Filter aktivitas">{tableFilters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}{demo && <span>{count}</span>}</button>)}</div><label className="cpo-search"><FiSearch /><input type="search" aria-label="Cari plat atau ID kunjungan" placeholder="Cari plat atau ID kunjungan..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
            {demo && filtered.length ? <div className="cpo-table-scroll"><table><thead><tr><th>Truk / kunjungan</th><th>Masuk · WIB</th><th>Keluar · WIB</th><th>Durasi di area</th><th>Pengisian</th><th>Klasifikasi jadwal</th><th><span className="cpo-sr-only">Detail</span></th></tr></thead><tbody>{filtered.map(visit => {
                const outside = !isOperational(visit.enteredAt, schedule), state = visitState(visit);
                return <tr key={visit.id} className={outside ? 'cpo-row-outside' : ''}><td><div className="cpo-truck-cell"><span className={`cpo-truck-avatar ${outside ? 'is-outside' : ''}`}><FiTruck /></span><div><strong>{visit.plate || 'Identitas belum terbaca'}</strong><small>{visit.id} <span>· {STATE_LABELS[state]}</span></small></div></div></td><td className="cpo-time-cell">{formatTime(visit.enteredAt)}</td><td className="cpo-time-cell">{formatTime(visit.exitedAt)}</td><td><strong>{formatDuration(durationMinutes(visit.enteredAt, visit.exitedAt || selectedNow))}</strong>{!visit.exitedAt && <small className="cpo-running">Berjalan</small>}</td><td><strong>{formatDuration(durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt || (!visit.exitedAt ? selectedNow : null)))}</strong>{state === 'loading' && <small className="cpo-running">Berlangsung</small>}</td><td><span className={`cpo-badge ${outside ? 'amber' : 'green'}`}>{outside ? <FiAlertTriangle /> : <FiCheckCircle />}{outside ? 'Di luar jadwal' : 'Dalam jadwal'}</span>{outside && <small className="cpo-review-status">{reviews[visit.id] ? 'Sudah ditinjau' : 'Perlu tinjauan'}</small>}</td><td><button type="button" className="cpo-icon-button" aria-label={`Lihat detail ${visit.plate || visit.id}`} onClick={() => setSelectedVisit(visit)}><FiChevronRight /></button></td></tr>;
            })}</tbody></table></div> : <div className="cpo-empty-table"><FiTruck /><h3>{demo ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas dari AI'}</h3><p>{demo ? 'Coba kata pencarian atau filter yang berbeda.' : 'Jumlah truk dan durasi akan tercatat setelah deteksi terhubung. Nilai kosong bukan berarti tidak ada aktivitas.'}</p>{demo && <button type="button" className="cpo-button" onClick={() => { setFilter('all'); setQuery(''); }}>Reset filter</button>}</div>}
            <footer className="cpo-table-footer"><span>{demo ? `${filtered.length} dari ${summary.visits.length} kunjungan contoh` : 'Menunggu pencatatan aktivitas'}</span><span><FiInfo />Satu sesi kunjungan dihitung sekali. Pengisian dan waktu di area dibedakan.</span></footer>
        </section>

        <div className="cpo-bottom-grid"><section className="cpo-panel cpo-traffic-panel"><header className="cpo-panel-header"><div className="cpo-section-label"><FiActivity /><h2>Sebaran kedatangan</h2></div><span className="cpo-muted">Per 4 jam · WIB</span></header>{demo ? <HourlyChart visits={summary.visits.filter(visit => isOperational(visit.enteredAt, schedule))} /> : <div className="cpo-chart-empty">Grafik akan terisi setelah aktivitas truk terdeteksi.</div>}</section><section className="cpo-method-note"><span className="cpo-empty-icon"><FiShield /></span><div><h3>Deteksi membantu, keputusan tetap diverifikasi</h3><p>Aktivitas di luar jadwal ditandai untuk ditinjau petugas. Kualitas kamera, pencahayaan, dan kalibrasi zona memengaruhi hasil. Kehilangan video perlu ditangani sebagai gangguan pemantauan.</p><span><FiCheckCircle />Hitungan per kunjungan <i>·</i> <FiClock />Waktu konsisten dalam WIB</span></div></section></div>
        <footer className="cpo-page-footer"><span><i />{demo ? 'Mode contoh • Tidak ada kejadian nyata yang dicatat' : 'CCTV tersedia sesuai akses • AI Vision menunggu integrasi'}</span><span>CPO Loading · Security Control Center</span></footer>

        {scheduleTab && <ScheduleDialog schedule={schedule} initialTab={scheduleTab} selectedDate={selectedDate} user={user} canManage={canManage} onSave={saveSchedule} onClose={() => setScheduleTab(null)} />}
        {selectedVisit && <EventDetailsDialog visit={selectedVisit} schedule={schedule} now={selectedNow} review={reviews[selectedVisit.id]} canManage={canManage} onClose={() => setSelectedVisit(null)} onReview={review => { setReviews(previous => ({ ...previous, [selectedVisit.id]: review })); setMessage('Tinjauan contoh disimpan untuk sesi pratinjau ini.'); }} />}
        {message && <div className="cpo-toast" role="status"><FiCheckCircle /><span>{message}</span><button type="button" aria-label="Tutup pemberitahuan" onClick={() => setMessage('')}><FiX /></button></div>}
    </div>;
}
