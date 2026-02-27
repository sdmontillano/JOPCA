<template>
    <div>
      <h2 class="text-xl font-bold">Bank Accounts</h2>
      <ul>
        <li v-for="bank in banks" :key="bank.id">
          {{ bank.name }} - Balance: {{ bank.balance }}
        </li>
      </ul>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { getBanks } from '../services/bankService';
  
  const banks = ref<any[]>([]);
  
  onMounted(async () => {
    const response = await getBanks();
    banks.value = response.data;
  });
  </script>