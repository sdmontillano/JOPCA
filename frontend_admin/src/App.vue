 <template>
   <div>
    <nav class="bg-gray-800 text-white p-4 flex gap-6">
      <RouterLink to="/" class="hover:underline">Dashboard</RouterLink>
      <RouterLink to="/transactions" class="hover:underline">Transactions</RouterLink>
      <RouterLink to="/monthly-report" class="hover:underline">Monthly Report</RouterLink>
    </nav>
    <router-view />
   </div>
 </template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>
