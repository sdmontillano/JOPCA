import { createRouter, createWebHistory } from "vue-router";

// Import your views
import Dashboard from "@/views/Dashboard.vue";
import Transactions from "@/views/Transactions.vue";
import MonthlyReport from "@/views/MonthlyReport.vue";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/transactions",
    name: "Transactions",
    component: Transactions,
  },
  {
    path: "/monthly-report",
    name: "MonthlyReport",
    component: MonthlyReport,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
