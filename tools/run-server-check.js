try {
  require('../server');
  console.log('Server require completed without immediate exceptions. Check logs for listening message.');
} catch (err) {
  console.error('Server failed to start:', err && err.stack ? err.stack : err);
  process.exit(1);
}
