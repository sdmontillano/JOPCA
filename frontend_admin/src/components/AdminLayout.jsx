import { useState } from "react";
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, IconButton, Breadcrumbs, Link, Divider } from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PeopleIcon from "@mui/icons-material/People";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";

const DRAWER_WIDTH = 280;

const adminSections = [
  { id: "home", title: "Home", path: "/admin", icon: <DashboardIcon /> },
  { id: "transactions", title: "Transactions", path: "/admin/transactions", icon: <ReceiptIcon /> },
  { id: "banks", title: "Banks", path: "/admin/banks", icon: <AccountBalanceIcon /> },
  { id: "pdc", title: "PDC", path: "/admin/pdc", icon: <EventNoteIcon /> },
  { id: "pcf", title: "PCF", path: "/admin/pcf", icon: <AccountBalanceWalletIcon /> },
  { id: "users", title: "Users", path: "/admin/users", icon: <PeopleIcon /> },
];

export default function AdminLayout({ children, title, breadcrumbs }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.hash = "/login";
    window.location.reload();
  };

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/") return "home";
    const section = adminSections.find(s => path.startsWith(s.path) && s.path !== "/admin");
    return section ? section.id : "home";
  };

  const currentSection = getCurrentSection();

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#1e293b" }}>
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: "1px solid #334155" }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ color: "white", fontWeight: "bold", fontSize: 18 }}>J</Typography>
        </Box>
        <Typography variant="h6" sx={{ color: "white", fontWeight: 600, fontSize: 16 }}>
          JOPCA Admin
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, borderBottom: "1px solid #334155" }}>
        <Typography variant="caption" sx={{ color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: 1 }}>
          Administration
        </Typography>
      </Box>

      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {adminSections.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1,
                  bgcolor: isActive ? "#0ea5e9" : "transparent",
                  "&:hover": { bgcolor: isActive ? "#0ea5e9" : "#334155" },
                  py: 1,
                }}
              >
                <ListItemIcon sx={{ color: isActive ? "white" : "#94a3b8", minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "white", 
                    fontWeight: isActive ? 600 : 400, 
                    fontSize: 14 
                  }}
                >
                  {item.title}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "#334155" }} />

      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate("/dashboard")}
            sx={{ borderRadius: 1, "&:hover": { bgcolor: "#334155" }, py: 1 }}
          >
            <ListItemIcon sx={{ color: "#94a3b8", minWidth: 36 }}>
              <ArrowBackIcon />
            </ListItemIcon>
            <Typography variant="body2" sx={{ color: "#e2e8f0", fontSize: 14 }}>
              Back to Dashboard
            </Typography>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{ borderRadius: 1, "&:hover": { bgcolor: "#334155" }, py: 1 }}
          >
            <ListItemIcon sx={{ color: "#94a3b8", minWidth: 36 }}>
              <LogoutIcon />
            </ListItemIcon>
            <Typography variant="body2" sx={{ color: "#e2e8f0", fontSize: 14 }}>
              Log out
            </Typography>
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f1f5f9" }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, 
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: "#ffffff",
          color: "#1e293b",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <Breadcrumbs separator="›" aria-label="breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <Link
                    key={index}
                    color="inherit"
                    underline={crumb.href ? "hover" : "none"}
                    href={crumb.href}
                    onClick={(e) => {
                      if (crumb.href) {
                        e.preventDefault();
                        navigate(crumb.href);
                      }
                    }}
                    sx={{ 
                      cursor: crumb.href ? "pointer" : "default",
                      fontSize: 14,
                      color: index === breadcrumbs.length - 1 ? "#1e293b" : "#64748b"
                    }}
                  >
                    {crumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Home
              </Typography>
            )}
          </Box>

          <Typography variant="body2" sx={{ color: "#64748b", fontSize: 13 }}>
            Welcome, <strong>{localStorage.getItem("username") || "Admin"}</strong>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, border: "none" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, border: "none" },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: "64px"
        }}
      >
        {title && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: "#1e293b", mb: 0.5 }}>
              {title}
            </Typography>
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}
