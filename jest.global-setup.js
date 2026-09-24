/**
 * Tests laufen in einer Zeitzone mit Sommerzeit.
 *
 * In UTC gibt es keine Zeitumstellung — dort blieb ein Fehler unentdeckt, der
 * die Rätselnummer von Ende März bis Ende Oktober um einen Tag verschob.
 * Berlin ist zudem der Hauptmarkt.
 */
module.exports = async () => {
  process.env.TZ = 'Europe/Berlin';
};
