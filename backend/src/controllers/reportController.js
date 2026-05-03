const { createObjectCsvStringifier } = require('csv-writer');
const QueueEntry = require('../models/QueueEntry');
const Service = require('../models/Service');

/**
 * GET /api/reports/export
 * Generates a CSV report of all queue history and streams it as a download.
 * Admin-only (enforced by middleware on the route).
 */
exports.exportReport = async (req, res) => {
    try {
        // Pull every queue entry (waiting, served, cancelled) from MongoDB
        const entries = await QueueEntry.find()
            .populate('serviceId')
            .sort({ joinedAt: -1 });

        // Build CSV rows
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'userName',    title: 'User Name' },
                { id: 'userEmail',   title: 'User Email' },
                { id: 'serviceName', title: 'Service' },
                { id: 'priority',    title: 'Priority' },
                { id: 'status',      title: 'Status' },
                { id: 'joinedAt',    title: 'Joined At' },
                { id: 'updatedAt',   title: 'Last Updated' }
            ]
        });

        const records = entries.map(e => ({
            userName:    e.userName,
            userEmail:   e.userEmail,
            serviceName: e.serviceId ? e.serviceId.name : 'Unknown',
            priority:    e.priority ?? 0,
            status:      e.status,
            joinedAt:    e.joinedAt ? new Date(e.joinedAt).toLocaleString() : '',
            updatedAt:   e.updatedAt ? new Date(e.updatedAt).toLocaleString() : ''
        }));

        // Compute aggregate statistics
        const totalServed = entries.filter(e => e.status === 'served').length;
        const totalCancelled = entries.filter(e => e.status === 'cancelled').length;
        const totalWaiting = entries.filter(e => e.status === 'waiting').length;

        // Average wait time per service (for served entries with servedAt)
        const serviceStats = {};
        entries.forEach(e => {
            const sName = e.serviceId ? e.serviceId.name : 'Unknown';
            if (!serviceStats[sName]) serviceStats[sName] = { totalWait: 0, count: 0 };
            if (e.status === 'served' && e.servedAt && e.joinedAt) {
                const waitMins = (new Date(e.servedAt) - new Date(e.joinedAt)) / 60000;
                serviceStats[sName].totalWait += waitMins;
                serviceStats[sName].count += 1;
            }
        });

        // Build CSV content: data rows + blank line + statistics
        let csvContent = csvStringifier.getHeaderString() +
            csvStringifier.stringifyRecords(records);

        csvContent += '\n';
        csvContent += '"--- QUEUE USAGE STATISTICS ---","","","","","",""\n';
        csvContent += `"Total Users Served","${totalServed}","","","","",""\n`;
        csvContent += `"Total Users Cancelled","${totalCancelled}","","","","",""\n`;
        csvContent += `"Total Users Waiting","${totalWaiting}","","","","",""\n`;
        csvContent += `"Total Records","${entries.length}","","","","",""\n`;
        csvContent += '\n';
        csvContent += '"--- AVERAGE WAIT TIME PER SERVICE ---","","","","","",""\n';

        for (const [name, stats] of Object.entries(serviceStats)) {
            const avg = stats.count > 0 ? (stats.totalWait / stats.count).toFixed(1) : 'N/A';
            csvContent += `"${name}","${avg} mins","(${stats.count} served)","","","",""\n`;
        }

        // Stream as a file download
        const filename = `QueueSmart_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);

        console.log(`[REPORT] CSV exported — ${records.length} records, ${totalServed} served`);
    } catch (error) {
        console.error('[REPORT ERROR]', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
};

