import { FiClock, FiSettings, FiCalendar } from 'react-icons/fi';
import { dateKey, formatDate, isOperational, operationalWindows, planForDate, scheduleLabel, wibParts } from '../loadingModel.js';

export default function ScheduleSummary({ schedule, date, now, demo, onEdit }) {
    const plan = planForDate(schedule, date), bands = operationalWindows(schedule, date);
    const display = !plan.open && bands.length ? { ...plan, open: true, start: bands[0][0], end: bands[0][1] } : plan;
    const current = demo || date === dateKey(), open = isOperational(now, schedule);
    const position = time => (Number(time.slice(0, 2)) * 60 + Number(time.slice(3))) / 1440 * 100;
    return <section className="cpo-panel cpo-schedule-card">
        <header className="cpo-panel-header"><div className="cpo-section-label"><FiClock /><h2>Jam operasional</h2><span className={`cpo-badge ${plan.special ? 'amber' : 'neutral'}`}>{plan.special ? 'Khusus' : 'Normal'} · draf</span></div><button type="button" className="cpo-icon-button" aria-label="Lihat atau ubah jadwal normal" onClick={() => onEdit('normal')}><FiSettings /></button></header>
        <div className="cpo-schedule-body"><div><strong className="cpo-operating-hours">{scheduleLabel(display)}</strong><span className={`cpo-hours-state ${open ? 'is-open' : ''}`}>{current ? `${open ? 'Dalam' : 'Di luar'} jam operasional${demo ? ' · contoh' : ''}` : formatDate(date)}</span></div><button type="button" className="cpo-button" onClick={() => onEdit('special')}><FiCalendar /><span>Jadwal khusus</span></button></div>
        <div className="cpo-dayline"><div className="cpo-dayline-track">{bands.map(([start, end]) => <span key={start} style={{ left: `${position(start)}%`, width: `${position(end) - position(start)}%` }} />)}{current && <i style={{ left: `${wibParts(now).minute / 1440 * 100}%` }} />}</div><span>00</span><span>12</span><span>24 WIB</span></div>
    </section>;
}
