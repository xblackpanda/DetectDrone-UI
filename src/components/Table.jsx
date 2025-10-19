const allegianceLabel = {
  friendly: "ฝ่ายมิตร",
  hostile: "ฝ่ายศัตรู",
  neutral: "ฝ่ายเฝ้าระวัง",
  unknown: "ยังไม่ระบุ",
};

const formatNumber = (value, fractionDigits = 1) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

export default function IntelPanel({ drones = [], radiusKm, timestamp }) {
  const formattedDate = timestamp
    ? timestamp.toLocaleString("th-TH", {
        dateStyle: "full",
        timeStyle: "medium",
      })
    : "-";

  const sortedDrones = [...drones].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="intel-panel">
      <header className="intel-panel__header">
        <h2>พื้นที่เตือนภัย</h2>
        <p>โดรนภายในรัศมี {formatNumber(radiusKm, 0)} กม. จากฐานควบคุม</p>
      </header>

      <div className="intel-panel__list">
        {sortedDrones.length === 0 ? (
          <div className="intel-panel__empty">ไม่มีเป้าหมายในระยะที่กำหนด</div>
        ) : (
          sortedDrones.map((drone) => (
            <article key={drone.id} className="intel-card">
              <div className="intel-card__header">
                <span className="intel-card__id">{drone.id}</span>
                <span className="intel-card__badge" style={{ backgroundColor: drone.statusColor }}>
                  {allegianceLabel[drone.allegiance] ?? drone.allegiance}
                </span>
              </div>
              <div className="intel-card__row">
                <label>พิกัด</label>
                <span>
                  LAT {drone.lat.toFixed(3)} / LNG {drone.lng.toFixed(3)}
                </span>
              </div>
              <div className="intel-card__row">
                <label>ความเร็ว</label>
                <span>{formatNumber(drone.speed, 0)} กม./ชม.</span>
              </div>
              <div className="intel-card__row">
                <label>ความสูง</label>
                <span>{formatNumber(drone.altitude, 0)} ม.</span>
              </div>
              <div className="intel-card__row">
                <label>ระยะจากฐาน</label>
                <span>{formatNumber(drone.distanceKm, 1)} กม.</span>
              </div>
              <div className="intel-card__footer">อัปเดตล่าสุด {drone.lastSeen}</div>
            </article>
          ))
        )}
      </div>

      <footer className="intel-panel__footer">
        <h3>{formattedDate}</h3>
        <small>ระบบออกแบบสำหรับการตรวจจับโดรนทางการทหาร</small>
      </footer>
    </div>
  );
}
