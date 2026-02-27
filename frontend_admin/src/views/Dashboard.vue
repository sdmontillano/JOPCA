<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getDailySummary, getCashPositionSummary } from "@/services/api";

const dailySummary = ref<any>(null);
const cashPosition = ref<any[]>([]);

// Load data when component mounts
onMounted(async () => {
  try {
    // ✅ Fetch today's daily summary
    const { data: summaryData } = await getDailySummary();
    dailySummary.value = summaryData;

    // ✅ Fetch cash position grouped by area
    const { data: cashData } = await getCashPositionSummary();
    cashPosition.value = cashData;
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Daily Cash Dashboard</h1>

    <!-- Daily Summary -->
    <div class="bg-white shadow rounded p-4 mb-6">
      <h2 class="text-xl font-semibold mb-2">Daily Summary</h2>
      <div v-if="dailySummary">
        <p><strong>Date:</strong> {{ dailySummary.date }}</p>
        <p><strong>Collections:</strong> {{ dailySummary.total_collections }}</p>
        <p><strong>Disbursements:</strong> {{ dailySummary.total_disbursements }}</p>
        <p><strong>PDC:</strong> {{ dailySummary.pdc }}</p>
        <p><strong>Ending Balance:</strong> {{ dailySummary.ending_balance }}</p>
      </div>
      <div v-else>
        <p>Loading daily summary...</p>
      </div>
    </div>

    <!-- Cash Position Summary -->
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-xl font-semibold mb-2">Cash Position by Area</h2>
      <table class="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr class="bg-gray-100">
            <th class="border px-4 py-2 text-left">Area</th>
            <th class="border px-4 py-2 text-right">Total Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="area in cashPosition" :key="area.area">
            <td class="border px-4 py-2">{{ area.area }}</td>
            <td class="border px-4 py-2 text-right">{{ area.total_balance }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Optional Tailwind overrides or custom styles */
</style>
