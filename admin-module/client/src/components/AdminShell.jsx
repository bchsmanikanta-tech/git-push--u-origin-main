import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AdminShell = ({ title, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="ml-64">
        <Navbar title={title} />
        <div className="pt-16">{children}</div>
      </div>
    </div>
  );
};

export default AdminShell;
