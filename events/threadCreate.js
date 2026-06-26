const {
  feedbackChannelIds,
  registerFeedbackThread
} = require("../feedback");

function registerThreadCreate(client) {
  client.on("threadCreate", async (thread) => {
    if (feedbackChannelIds.has(thread.parentId)) {
      await thread.join().catch(() => {});
      registerFeedbackThread(thread);
    }
  });
}

module.exports = { registerThreadCreate };
