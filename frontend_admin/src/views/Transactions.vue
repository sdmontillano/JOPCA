<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api"; // using your central axios instance

const transactions = ref<any[]>([]);
const loading = ref(false);

// Filters
const filterDate = ref<string>("");
const filterType = ref<string>("");
const filterAccount = ref<string>("");

// Transaction types (same as backend)
const transactionTypes = [
  "deposit",
  "collections",
  "local_deposits",
  "disbursement",
  "returned_check",
  "bank_charges",
  "adjustments",
  "transfer",
  "fund_transfer",
  "interbank_transfer",
  "post_dated_check",
];

// Load transactions with filters
const loadTransactions = async () => {
  loading.value = true;
  try {
    const { data } = await api.get("/transactions/", {
      params: {
        date: filterDate.value || undefined,
        type: filterType.value || undefined,
        bank_account: filterAccount.value || undefined,
      },
    });
    transactions.value = data;
  } catch (error) {
    console.error("Error loading transactions:", error);
  } finally {
    loading.value = false;
  }
};

// Initial load
onMounted(() => {
  loadTransactions();
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Transactions</h1>

    <!-- Filters -->
    <div class="bg-white shadow rounded p-4 mb-6">
      <h2 class="text-xl font-semibold mb-2">Filters</h2>
      <div class="flex gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium">Date</label>
          <input
            type="date"
            v-model="filterDate"
            class="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Type</label>
          <select v-model="filterType" class="border rounded px-2 py-1">
            <option value="">All</option>
            <option v-for="t in transactionTypes" :key="t" :value="t">
              {{ t }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium">Account #</label>
          <input
            type="text"
            v-model="filterAccount"
            placeholder="Account number"
            class="border rounded px-2 py-1"
          />
        </div>
      </div>
      <button
        @click="loadTransactions"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Apply Filters
      </button>
    </div>

    <!-- Transactions Table -->
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-xl font-semibold mb-2">Transaction List</h2>
      <div v-if="loading">Loading transactions...</div>
      <table
        v-else
        class="table-auto w-full border-collapse border border-gray-300"
      >
        <thead>
          <tr class="bg-gray-100">
            <th class="border px-4 py-2">Date</th>
            <th class="border px-4 py-2">Account</th>
            <th class="border px-4 py-2">Type</th>
            <th class="border px-4 py-2">Amount</th>
            <th class="border px-4 py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td class="border px-4 py-2">{{ tx.date }}</td>
            <td class="border px-4 py-2">{{ tx.bank_account.account_number }}</td>
            <td class="border px-4 py-2">{{ tx.type }}</td>
            <td class="border px-4 py-2 text-right">{{ tx.amount }}</td>
            <td class="border px-4 py-2">{{ tx.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Optional Tailwind overrides */
</style>
