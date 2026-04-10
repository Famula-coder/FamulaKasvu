const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add close button and backdrop click to sales modal
content = content.replace(
    `                    {modals.sales && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <h3 className="text-xl font-black text-center text-stone-900 mb-2">Kirjaa lisäpalvelu</h3>`,
    `                    {modals.sales && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, sales: false }))}></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-black text-stone-900">Kirjaa lisäpalvelu</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, sales: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>`
);

// 2. Add confirm exit logic for marketingModal
content = content.replace(
    `                {marketingModal && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>`,
    `                {marketingModal && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => { if(window.confirm('Oletko varma? Tallentamattomat tiedot menetetään.')) setMarketingModal(false); }}></div>`
);

// 3. Add confirm exit logic for financialModal (it had onClick={() => setFinancialModal(false)})
content = content.replace(
    `                {financialModal && editingFinancialStatement && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setFinancialModal(false)}></div>`,
    `                {financialModal && editingFinancialStatement && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => { if(window.confirm('Oletko varma? Tallentamattomat tiedot menetetään.')) setFinancialModal(false); }}></div>`
);

// 4. Add backdrop to adminPlan
content = content.replace(
    `                    {modals.adminPlan && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>`,
    `                    {modals.adminPlan && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => { if(window.confirm('Oletko varma? Tallentamattomat tiedot menetetään.')) setModals(prev => ({ ...prev, adminPlan: false })); }}></div>`
);

// 5. Add backdrop to editTrayTask
content = content.replace(
    `                    {modals.editTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>`,
    `                    {modals.editTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, editTrayTask: false }))}></div>`
);

// 6. Add backdrop to newTrayTask
content = content.replace(
    `                    {modals.newTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>`,
    `                    {modals.newTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, newTrayTask: false }))}></div>`
);

// 7. Add backdrop to editTask
content = content.replace(
    `                    {modals.editTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>`,
    `                    {modals.editTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, editTask: false }))}></div>`
);

fs.writeFileSync('src/App.jsx', content);
console.log('Modals updated');
