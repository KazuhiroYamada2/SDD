if (process.env.NODE_ENV !== 'production') {
  console.error('Production startup configuration is invalid.');
  process.exitCode = 1;
} else {
  import('../dist/server.js').catch(() => {
    console.error('Production startup configuration is invalid.');
    process.exitCode = 1;
  });
}
