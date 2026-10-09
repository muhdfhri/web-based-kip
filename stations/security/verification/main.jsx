// Isolated QA page. Uses the actual target components; not part of the product routes.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CctvFeedTab from '../frontend/tabs/CctvFeed/CctvFeedTab.jsx';
import CctvModal from '../frontend/components/CctvModal.jsx';

function VerifyCctv() {
    const [cameras, setCameras] = useState([]);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        fetch('/api/security/cctv').then(response => response.json()).then(result => setCameras(result.data));
    }, []);
    return <main style={{ fontFamily: 'Arial, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 16 }}>
        <h2>MEWAH-KIP-NEW — Verifikasi CCTV</h2>
        <CctvFeedTab cctvCameras={cameras} setSelectedCctv={setSelected} />
        <CctvModal selectedCctv={selected} setSelectedCctv={setSelected} />
    </main>;
}
createRoot(document.getElementById('root')).render(<VerifyCctv />);
