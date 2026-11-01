// Notify one reachable staff member, preferring the owner. Never copy private submissions.
export async function notifySubmissionStaff(guild, job) {
  const recipients = new Map();
  try { const owner = await guild.fetchOwner(); if (!owner.user.bot) recipients.set(owner.id, owner.user); }
  catch (error) { console.warn('Could not fetch owner for submission notice:', error.message); }
  for (const member of guild.members.cache.values()) {
    if (!member.user.bot && (member.permissions.has('Administrator') || member.permissions.has('ManageMessages') || member.permissions.has('ModerateMembers'))) recipients.set(member.id, member.user);
  }
  const content = job.type === 'lore'
    ? `📝 **Lore submission awaiting review**\nServer: ${guild.name}\nStudent: <@${job.userId}>\nSubmission: **${job.id}**\nOwner/admin: use /lore-review list to review it. Publication and seasonal reward approval are separate.`
    : `📝 **Discussion submission awaiting review**\nServer: ${guild.name}\nStudent: <@${job.userId}>\nSeason: **${job.season}** · Question: **${job.activityId}**\nSubmission: **${job.id}**\n${job.url ? `Public message: ${job.url}\n` : 'Private explanation: open the review queue to read it.\n'}Owner/admin: use /pilot queue season:${job.season}, then /pilot review season:${job.season} id:${job.id}.`;
  for (const recipient of recipients.values()) {
    try { await recipient.send({ content, allowedMentions: { parse: [] } }); console.log(`Delivered ${job.type} submission notice ${job.id} to staff ${recipient.id}.`); return true; }
    catch (error) { console.warn(`Submission DM failed for staff ${recipient.id}:`, error.message); }
  }
  return false;
}
