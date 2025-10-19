import { NavLink } from "react-router-dom";

export default function MyButton({ label, caption, to = "#", active = false, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const classes = ["nav-button"];
        if (active || isActive) {
          classes.push("nav-button--active");
        }
        return classes.join(" ");
      }}
      onClick={onClick}
      end={to === "/"}
    >
      <span className="nav-button__label">{label}</span>
      {caption ? <span className="nav-button__caption">{caption}</span> : null}
    </NavLink>
  );
}
