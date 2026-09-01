<script setup lang="ts"></script>

<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-title>
        <v-icon icon="mdi-view-dashboard" class="mr-2" />
        my-dashboard
      </v-app-bar-title>
      <v-spacer />
      <v-btn :to="{ name: 'home' }" prepend-icon="mdi-home">Home</v-btn>
      <v-btn :to="{ name: 'about' }" prepend-icon="mdi-information">About</v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
