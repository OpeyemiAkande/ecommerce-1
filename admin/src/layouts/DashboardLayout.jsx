import {Outlet} from "react-router";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  return (
    <div className="drawer lg:drawer-open">
      <input
        type="checkbox"
        id="my-drawer"
        className="drawer-toggle"
        defaultChecked
      />

      <div className="drawer-content">
        <Navbar />

        <main className="p-6">
          <Outlet />
        </main>
      </div>

      <Sidebar />
    </div>
  );
}

export default DashboardLayout;
