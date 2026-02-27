<script setup lang="ts">
import { ref } from "vue";
import { getMonthlySummary } from "@/services/api";

const monthlyReport = ref<any>(null);
const selectedMonth = ref<string>("");

// Load monthly report
const loadMonthlyReport = async () => {
  if (!selectedMonth.value) return;
  try {
    const { data } = await getMonthlySummary(selectedMonth.value);
    monthlyReport.value = data;
  } catch (error) {
    console.error("Error loading monthly report:", error);
  }
};
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Monthly Report</h1>

    <!-- Month Selector -->
    <div class="bg-white shadow rounded p-4 mb-6">
      <h2 class="text-xl font-semibold mb-2">Select Month</h2>
      <div class="flex gap-4 items-center">
        <input
          type="month"
          v-model="selectedMonth"
          class="border rounded px-2 py-1"
        />
        <button
          @click="loadMonthlyReport"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Load Report
        </button>
      </div>
    </div>

    <!-- Monthly Report Data -->
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-xl font-semibold mb-2">Report Details</h2>
      <div v-if="monthlyReport">
        <p><strong>Month:</strong> {{ monthlyReport.month }}</p>
        <p><strong>Total Inflows:</strong> {{ monthlyReport.total_inflows }}</p>
        <p><strong>Total Disbursements:</strong> {{ monthlyReport.total_disbursements }}</p>
        <p><strong>Total PDC:</strong> {{ monthlyReport.total_pdc }}</p>
        <p><strong>Ending Balance:</strong> {{ monthlyReport.ending_balance }}</p>
      </div>
      <div v-else>
        <p>No report loaded yet. Select a month above.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Optional Tailwind overrides */
</style>