import MyButton from "./MyButton.jsx";

const navItems = [
  {
    id: "home",
    label: "Home",
    caption: "แสดงข้อมูลภาพรวม",
    to: "/",
  },
  {
    id: "routes",
    label: "Routes",
    caption: "แสดงข้อมูลเส้นทางบิน",
    to: "/routes",
  },
  {
    id: "settings",
    label: "Settings",
    caption: "ตั้งค่าระบบ",
    to: "/settings",
  },
];

export default function SideNav({ activeTab, statusLegend = [] }) {
  return (
    <nav className="side-nav">
      <div className="side-nav__header">
        <span className="side-nav__tag">RADAR OPS</span>
        <h1 className="side-nav__title">SKY GUARD</h1>
        <p className="side-nav__subtitle">By cpe_rmutt</p>
      </div>
      <div className="side-nav__menu">
        {navItems.map((item) => (
          <MyButton
            key={item.id}
            active={activeTab === item.id}
            label={item.label}
            caption={item.caption}
            to={item.to}
          />
        ))}
      </div>
      <div className="side-nav__footer">
        {statusLegend.length > 0 && (
          <div className="side-nav__legend">
            <h3 className="side-nav__legend-title">จำนวนโดรนในพื้นที่</h3>
            <ul className="side-nav__legend-list">
              {statusLegend.map(({ status, color, label, count }) => (
                <li key={status} className="side-nav__legend-item">
                  <span className="side-nav__legend-dot" style={{ backgroundColor: color }} />
                  <span>{`${label} (${count})`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <span className="side-nav__call-sign">CALLSIGN: TH-ALPHA-09</span>
        <span className="side-nav__status">STATUS: ONLINE</span>
      </div>
    </nav>
  );
}
