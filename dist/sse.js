let clients = [];
// Dodaj nowego klienta do listy
export const addClient = (res) => {
    clients.push(res);
    res.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
};
// Wyślij wiadomość do wszystkich klientów
export const sendEvent = (event, data) => {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
    });
};
// Endpoint SSE
export const handleSSE = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n');
    addClient(res);
};
