const fs = require('fs');
let code = fs.readFileSync('src/app/distributor/page.tsx', 'utf8');

// Add selection state
if (!code.includes("const [selectedBulkOrders, setSelectedBulkOrders] = useState<Set<string>>(new Set());")) {
    code = code.replace(
        "const [orders, setOrders] = useState<Order[]>([]);",
        "const [orders, setOrders] = useState<Order[]>([]);\n    const [selectedBulkOrders, setSelectedBulkOrders] = useState<Set<string>>(new Set());\n    const [isBulkUpdating, setIsBulkUpdating] = useState(false);"
    );
}

// Add toggle function
const toggleOrderSelection = `
    const toggleOrderSelection = (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedBulkOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };
    
    const handleBulkDeliver = async () => {
        if (selectedBulkOrders.size === 0) return;
        if (!confirm(\`Подтвердить доставку для \${selectedBulkOrders.size} заказов?\`)) return;
        setIsBulkUpdating(true);
        try {
            const res = await fetch('/api/orders/bulk-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds: Array.from(selectedBulkOrders), status: 'delivered' })
            });
            if (res.ok) {
                setOrders(prev => prev.map(o => selectedBulkOrders.has(o.order_id) ? { ...o, status: 'delivered' } : o));
                setSelectedBulkOrders(new Set());
            } else {
                alert('Ошибка при обновлении статусов');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsBulkUpdating(false);
        }
    };
`;
if (!code.includes("const toggleOrderSelection =")) {
    code = code.replace("// ==================== DATA LOADING ====================", toggleOrderSelection + "\n    // ==================== DATA LOADING ====================");
}

// Modify renderColumn to include "Select All" checkbox if it's the "Отгружены" column
const renderColumnReplace = `    const renderColumn = (title: string, Icon: any, colOrders: Order[], color: string) => {
        const isShippedCol = title === 'Отгружены';
        const allShippedIds = colOrders.map(o => o.order_id);
        const allSelected = allShippedIds.length > 0 && allShippedIds.every(id => selectedBulkOrders.has(id));
        const someSelected = allShippedIds.some(id => selectedBulkOrders.has(id));

        const handleSelectAll = () => {
            setSelectedBulkOrders(prev => {
                const next = new Set(prev);
                if (allSelected) {
                    allShippedIds.forEach(id => next.delete(id));
                } else {
                    allShippedIds.forEach(id => next.add(id));
                }
                return next;
            });
        };

        return (
        <div className="flex-shrink-0 w-[75vw] sm:w-auto sm:flex-1 min-w-0 sm:min-w-[220px]">
            <div className={\`card mb-3 \${color}\`}>
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <span className="ml-auto bg-white/50 rounded-full px-2 py-0.5 text-sm font-medium">
                        {colOrders.length}
                    </span>
                </div>
                {isShippedCol && colOrders.length > 0 && (
                    <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={allSelected} 
                                onChange={handleSelectAll}
                                className="rounded text-purple-600 focus:ring-purple-500 bg-white/50 border-black/10"
                            />
                            Выбрать все
                        </label>
                        {someSelected && (
                            <button 
                                onClick={handleBulkDeliver}
                                disabled={isBulkUpdating}
                                className="text-[10px] uppercase font-bold bg-purple-700 text-white px-2 py-1 rounded shadow-sm hover:bg-purple-800 transition-colors"
                            >
                                {isBulkUpdating ? '...' : \`Выдать (\${Array.from(selectedBulkOrders).filter(id => allShippedIds.includes(id)).length})\`}
                            </button>
                        )}
                    </div>
                )}
            </div>`;

code = code.replace(/const renderColumn = \(title: string, Icon: any, colOrders: Order\[\], color: string\) => \(\s*<div className="flex-shrink-0[^>]*>\s*<div className={`card mb-3 \${color}`}>\s*<div className="flex items-center gap-2">\s*<Icon className="w-5 h-5" \/>\s*<h3 className="font-semibold text-sm">{title}<\/h3>\s*<span className="ml-auto bg-white\/50 rounded-full px-2 py-0\.5 text-sm font-medium">\s*{colOrders\.length}\s*<\/span>\s*<\/div>\s*<\/div>/g, renderColumnReplace);

// Add checkbox to renderKanbanCard
const renderKanbanCardRegex = /const renderKanbanCard = \(order: Order\) => \{\s*const isOverdue = false; \/\/ TODO\s*const payStatus = order\.payment_status;\s*const lab = isLabOrder\(order\);\s*return \(\s*<div\s*key=\{order\.order_id\}\s*onClick=\{\(\) => setSelectedOrderId\(order\.order_id\)\}\s*className="card p-3 cursor-pointer group hover:border-blue-300 transition-all active:scale-\[0\.98\]"/;

const renderKanbanCardReplace = `    const renderKanbanCard = (order: Order) => {
        const isOverdue = false; // TODO
        const payStatus = order.payment_status;
        const lab = isLabOrder(order);
        const isSelected = selectedBulkOrders.has(order.order_id);
        const isShipped = order.status === 'shipped';

        return (
            <div
                key={order.order_id}
                onClick={() => isShipped && selectedBulkOrders.size > 0 ? toggleOrderSelection(order.order_id, {stopPropagation:()=>{}} as any) : setSelectedOrderId(order.order_id)}
                className={\`card p-3 cursor-pointer group hover:border-blue-300 transition-all active:scale-[0.98] \${isSelected ? 'ring-2 ring-purple-500 border-purple-500' : ''}\`}
            >
                {isShipped && (
                    <div className="absolute top-3 right-3 z-10" onClick={(e) => toggleOrderSelection(order.order_id, e)}>
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer pointer-events-none"
                        />
                    </div>
                )}
`;

code = code.replace(/const renderKanbanCard = \(order: Order\) => \{\s*const isOverdue = false; \/\/ TODO\s*const payStatus = order\.payment_status;\s*const lab = isLabOrder\(order\);\s*return \(\s*<div\s*key=\{order\.order_id\}\s*onClick=\{\(\) => setSelectedOrderId\(order\.order_id\)\}\s*className="card p-3 cursor-pointer group hover:border-blue-300 transition-all active:scale-\[0\.98\]"/g, renderKanbanCardReplace);

fs.writeFileSync('src/app/distributor/page.tsx', code);
console.log('Updated distributor page UI');
