const db = require('../config/db');

const TIME_ZONE = 'Asia/Manila';
const CHECK_INTERVAL_MS = 60 * 1000;

let timer = null;
let isRunning = false;

function getManilaDateTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`
    };
}

async function completeEligibleReservations() {
    if (isRunning) return;
    isRunning = true;

    try {
        const { date, time } = getManilaDateTime();
        const [result] = await db.query(
            `UPDATE reservations
             SET status = 'Completed'
             WHERE status = 'Approved'
               AND (
                   reservation_date < ?
                   OR (reservation_date = ? AND ? >= '22:00:00')
               )`,
            [date, date, time]
        );

        if (result.affectedRows > 0) {
            console.log(`Automatically completed ${result.affectedRows} reservation(s).`);
        }
    } catch (error) {
        console.error('Automatic reservation completion failed:', error.message);
    } finally {
        isRunning = false;
    }
}

function startReservationCompletionTask() {
    if (timer) return;

    // Run once at startup, then check each minute. The in-flight guard prevents
    // overlapping database updates if a query takes longer than the interval.
    void completeEligibleReservations();
    timer = setInterval(completeEligibleReservations, CHECK_INTERVAL_MS);
    timer.unref();
}

module.exports = { startReservationCompletionTask, getManilaDateTime };
