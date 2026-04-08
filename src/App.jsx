import React, { useState, useEffect } from 'react';
import { Compass, Mic, Globe, Home, TrendingUp, Briefcase, StickyNote, X, CheckCircle, Clock, UserPlus, List, ChevronLeft, ChevronRight, ChevronDown, Lightbulb, CalendarCheck, Pen, Check, Trash2, PlusCircle, Coins, ListTodo, Rocket, Paintbrush, Utensils, HeartPulse, Shirt, TreePine, Coffee, Leaf, Smartphone, Star, Headset, Quote, LogOut, Plus, MessageCircle, UserCheck, ArrowRight, ThumbsUp, Activity, HeartHandshake, ShoppingBag, Shield, HelpCircle, AlertTriangle, Calendar, Sparkles, Minus, Send, Loader2, User, Settings, Target, DownloadCloud, Heart, Pin, RefreshCw } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db, appId, googleProvider } from './firebase';

// --- HELPER: GENERATE UNIQUE ID ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// --- CONSTANTS & CSV DATA TEMPLATES ---
const FALLBACK_REGIONS = [
    { id: 'oulu', name: 'Famula Oulu' },
    { id: 'lappeenranta', name: 'Famula Lappeenranta' },
    { id: 'uusimaa', name: 'Famula Uusimaa' },
    { id: 'kuopio', name: 'Famula Kuopio' },
    { id: 'keskisuomi', name: 'Famula Keski-Suomi' }
];

const DEFAULT_TRAY_TASKS = [
    { id: generateId(), text: "LeadDesk-soitot (Uusasiakashankinta): 250 kpl / vko" },
    { id: generateId(), text: "Kaupan repäisymainokset (Paikallinen näkyvyys): 5 kpl / vko" },
    { id: generateId(), text: "Asiakastyytyväisyyskysely asiakaskäynneillä" },
    { id: generateId(), text: "Asiakaskäynnit (Luottamuksen rakentaminen): 3-4 kpl / vko" },
    { id: generateId(), text: "Sidosryhmätapaamiset (Palveluohjaajat jne): 1 kpl / vko" },
    { id: generateId(), text: "Digi- ja lehtimainonnan konversioiden optimointi: 1 kerta / vko" }
];

const GAMIFICATION_LEVELS = [
    { level: 0, maxHours: 100, title: "Aluevaltaaja", icon: "🥉", color: "text-[#cd7f32]", bgColor: "bg-[#cd7f32]/10", border: "border-[#cd7f32]/30", desc: "Perustan rakentaminen. Palkan turvaaminen." },
    { level: 1, maxHours: 250, title: "Työnjohtaja", icon: "🥈", color: "text-[#71717a]", bgColor: "bg-[#f4f4f5]", border: "border-[#e4e4e7]", desc: "Ensimmäiset työntekijät. Myyntivolyymin kasvatus." },
    { level: 2, maxHours: 426, title: "Kasvujohtaja", icon: "🥇", color: "text-[#eab308]", bgColor: "bg-[#fefce8]", border: "border-[#fef08a]", desc: "Kuopan ylitys. Ohjaa aikaa lisämyyntiin ja tukemiseen." },
    { level: 3, maxHours: Infinity, title: "Omistaja", icon: "💎", color: "text-[#06b6d4]", bgColor: "bg-[#ecfeff]", border: "border-[#a5f3fc]", desc: "Koneisto rullaa. Liiketoiminnan täysi skaalautuminen." }
];

const getGamificationLevel = (hours) => {
    return GAMIFICATION_LEVELS.find(l => (hours || 0) < l.maxHours) || GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1];
};

const GROWTH_TEMPLATES = [
    { id: '0_perustus', name: "Yleinen: 0. Perustus (0–100 h)", tasks: ["LeadDesk-soitot: 250 kpl / vko", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 3-4 kpl / vko", "Sidosryhmätapaamiset (palveluohjaajat): 1 kpl / vko", "Digi- ja lehtimainonnan optimointi: 1 kerta / vko"] },
    { id: '1_ensimmaiset', name: "Yleinen: 1. Ensimmäiset työntekijät (100–250 h)", tasks: ["LeadDesk-soitot: 350 kpl / vko", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 4-5 kpl / vko", "Sidosryhmätapaamiset (sote-ammattilaiset): 1-2 kpl / vko", "Rekrytointivalmius / Tiimin ohjaus: 2 h / vko"] },
    { id: '2_kuoppa', name: "Yleinen: 2. Kuoppa ja osa-aikainen vetäjä (250–360 h)", tasks: ["LeadDesk-soitot: 450 kpl / vko", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 4-5 kpl / vko", "Sidosryhmätapaamiset (lääkärit, apteekit): 1-2 kpl / vko", "Omaisviestintä ja lisämyynti nykyasiakkaille", "Rekrytointi ja tiimin hallinta: Säännöllisesti"] },
    { id: '3_skaalautuminen', name: "Yleinen: 3. Skaalautuminen (Yli 426 h)", tasks: ["LeadDesk-soitot (Ammattisoittajat): 550 kpl / vko", "Kaupan repäisymainokset: 10 kpl / vko", "Asiakaskäynnit: 5-6 kpl / vko", "Sidosryhmätapaamiset (Vaikuttajat): 2 kpl / vko"] },
    { id: 'uusimaa_1', name: "Uusimaa: Kuukausi 1 (Koneen käynnistys)", tasks: ["LeadDesk-soitot (Uudet kontaktit): 300 kpl / vko", "Kaupan repäisymainokset (Nopea näkyvyys): 10 kpl / vko", "Asiakaskäynnit: 4 kpl / vko", "Sidosryhmätapaamiset (Palveluohjaajat): 2 kpl / vko", "Pyydä suosituksia kaikilta uusilta asiakkailta"] },
    { id: 'oulu_1', name: "Oulu: Kuukausi 1 (Tekemisen meininki)", tasks: ["LeadDesk-soittorutiini ehdottomaksi: 250 kpl / vko", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 3-4 kpl / vko", "Sidosryhmätapaamiset (Palveluohjaajat): 1 kpl / vko", "Asiakastyytyväisyys-app heti aktiiviseen käyttöön"] },
    { id: 'lpr_1', name: "Lappeenranta: Kuukausi 1 (Tehon lisäys)", tasks: ["LeadDesk-soitot: 350 kpl / vko (Volyymin nosto)", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 4-5 kpl / vko", "Sidosryhmätapaamiset (Sote-ammattilaiset): 1 kpl / vko"] },
    { id: 'jkl_1', name: "Keski-Suomi: Kuukausi 1 (Kuopan selätys)", tasks: ["LeadDesk-soitot (Poistuman kattaminen): 450 kpl / vko", "Kaupan repäisymainokset: 5 kpl / vko", "Asiakaskäynnit: 4-5 kpl / vko", "Sidosryhmätapaamiset (Lääkärit, apteekit): 1-2 kpl / vko", "Omaisviestintä ja lisämyynti nykyasiakkaille"] }
];

const FALLBACK_PRODUCTS = [
    { id: 10, title: "Famula Startti", icon: "Rocket", content: "1h kartoitus + 3h palvelua.", pitch: "Riskitön tapa kokeilla." },
    { id: 1, title: "Kodin Suursiivous", icon: "Paintbrush", content: "Ikkunat, verhot, matot.", pitch: "Säästäkää selkäänne." }
];

const FALLBACK_SCRIPTS = [
    { id: "leaddesk", title: "LeadDesk - Myyntispiikki", content: "Hei, täällä [Nimi] Famulasta...\nMiten on päivä sujunut?" }
];

const SURVEY_ITEMS = [
    { id: 1, type: "emoji", title: "1. KOHTAAMINEN", negative: "Kohtaaminen ei ole ollut kunnioittavaa", positive: "Kohtaaminen on ollut kunnioittavaa ja olen tullut kuulluksi", speech_negative: "kohtaaminen ei ole ollut mielestäsi kunnioittavaa", speech_positive: "kohtaaminen on ollut kunnioittavaa ja olet tullut kuulluksi" },
    { id: 2, type: "emoji", title: "2. SISÄLTÖ", negative: "Käynnin sisältö ei ole vastannut tarpeitani", positive: "Käyntien sisältö on vastannut tarpeitani", speech_negative: "käyntien sisältö ei ole vastannut tarpeitasi", speech_positive: "käyntien sisältö vastaa tarpeitasi hyvin" },
    { id: 3, type: "emoji", title: "3. TOIMINTATAVAT", negative: "Toimintatapa ei sopinut minulle", positive: "Työntekijän tapa työskennellä on ollut tilanteeseen sopiva", speech_negative: "työskentelytapa ei ole sopinut sinulle parhaalla mahdollisella tavalla", speech_positive: "työntekijän tapa työskennellä on ollut tilanteeseen sopiva" },
    { id: 4, type: "nps", title: "4. SUOSITTELU", negative: "En suosittelisi (1)", positive: "Suosittelisin varmasti (10)", speech_negative: "et olisi valmis suosittelemaan palvelua", speech_positive: "suosittelisit meitä todennäköisesti ystävillesi" }
];

const EMOJI_SCALE = [
    { value: 1, emoji: "😞", label: "Huono", color: "bg-red-100 border-red-300 ring-red-400" },
    { value: 2, emoji: "🙁", label: "Välttävä", color: "bg-orange-100 border-orange-300 ring-orange-400" },
    { value: 3, emoji: "😐", label: "Neutraali", color: "bg-[#fdf2f2] border-[#fde8e8] ring-[#9b2c2c]" },
    { value: 4, emoji: "🙂", label: "Hyvä", color: "bg-[#dcfce7] border-[#2f855a] ring-[#2f855a]" },
    { value: 5, emoji: "☀️", label: "Erinomainen", color: "bg-[#f0fdf4] border-[#22543d] ring-[#22543d]" }
];

const SERVICE_NEEDS = [
    { id: 'home', title: "Kodin askareet & Ravinto", icon: "Home", prompt: "Esim. Jaksatko hoitaa kotia ja ruoan laitto onnistuu.", subServices: ["Kevyt ylläpitosiivous", "Ruoanlaitto kotona"] },
    { id: 'errands', title: "Asiointi & Liikkuminen", icon: "ShoppingBag", prompt: "Esim. Pääsetkö käymään kaupassa, apteekissa ja lääkärissä.", subServices: ["Kauppa-asiointi", "Lääkärisaattaja"] },
    { id: 'safety', title: "Turvallisuus & Seura", icon: "Shield", prompt: "Esim. Tunnetko olosi turvalliseksi ja sinulla on riittävästi juttuseuraa.", subServices: ["Turvakartoitus", "Avainpalvelu"] },
    { id: 'wellbeing', title: "Virkistys & Hyvinvointi", icon: "Heart", prompt: "Tunnetko itsesi virkeäksi ja päivissä on iloa.", subServices: ["Ulkoiluseura", "Kiireetön kahvittelu"] }
];

const NAME_DAYS = { "1.1": "Uudenvuodenpäivä", "4.2": "Armi, Ronja", "24.2": "Matti", "28.2": "Onni" };
const FALLBACK_MONTHS = [ { name: "Tammikuu", theme: "Kulttuuria sisätiloissa", tip: "Museot ja teatterit" }, { name: "Helmikuu", theme: "Ystävänpäivä & Leivonta", tip: "Perehdytys ja Startti" }, { name: "Maaliskuu", theme: "Kodin turvallisuus", tip: "Mattojen puistelu" }, { name: "Huhtikuu", theme: "Digiapu", tip: "Videopuhelut" }, { name: "Toukokuu", theme: "Äitienpäivä", tip: "Ikkunanpesut" }, { name: "Kesäkuu", theme: "Ulkoilu", tip: "Torikahvit" }, { name: "Heinäkuu", theme: "Kesäretket", tip: "Puistokävelyt" }, { name: "Elokuu", theme: "Marjastus", tip: "Torilta marjat" }, { name: "Syyskuu", theme: "Syyssiivous", tip: "Pimenevät illat" }, { name: "Lokakuu", theme: "Lukeminen", tip: "Valokuvat" }, { name: "Marraskuu", theme: "Isänpäivä", tip: "Talvivaatteet" }, { name: "Joulukuu", theme: "Jouluvalmistelut", tip: "Joulukortit" } ];

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
}

function getWeeksForQuarter(year, quarter) {
    const weeks = [];
    const firstMonthOfQuarter = (quarter - 1) * 3;
    let d = new Date(year, firstMonthOfQuarter, 1);
    
    // Siirry ensimmäisen viikon maanantaihin
    while (d.getDay() !== 1) {
        d.setDate(d.getDate() - 1);
    }
    
    // Käydään viikkoja läpi kunnes ylitetään kvartaali
    while (d.getMonth() < firstMonthOfQuarter + 3 || (d.getMonth() === firstMonthOfQuarter + 3 && d.getDay() !== 1)) {
        const dForWeek = new Date(d.valueOf());
        dForWeek.setUTCDate(dForWeek.getUTCDate() + 4 - (dForWeek.getUTCDay()||7));
        const startOfYear = new Date(Date.UTC(dForWeek.getUTCFullYear(),0,1));
        const weekNum = Math.ceil((((dForWeek - startOfYear) / 86400000) + 1)/7);
        
        const startStr = d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
        const endDate = new Date(d);
        endDate.setDate(d.getDate() + 6);
        const endStr = endDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
        
        weeks.push({ weekNum, label: `Vko ${weekNum} (${startStr} - ${endStr})` });
        
        d.setDate(d.getDate() + 7);
        if(d.getFullYear() > year) break;
    }
    return weeks;
}

function getTodayInfo(offsetDays = 0) {
    const now = new Date();
    now.setDate(now.getDate() + offsetDays);
    const dateStr = now.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const dayMonthKey = `${new Date().getDate()}.${new Date().getMonth() + 1}`; // Keep the name day for actual today
    return { dateStr: dateStr.charAt(0).toUpperCase() + dateStr.slice(1), nameDay: NAME_DAYS[dayMonthKey] || "Päivän sankarit", weekNum: getWeekNumber(now), monthIdx: now.getMonth(), year: now.getFullYear() };
}

const getIconByName = (name, props) => {
    const icons = { Rocket, Paintbrush, Utensils, HeartPulse, Shirt, TreePine, Coffee, Leaf, Smartphone, Star, Headset, Home, ShoppingBag, Shield, Heart };
    const IconComponent = icons[name] || Star;
    return <IconComponent {...props} />;
};

function getCoachSummary(answers) {
    if (!answers) return null;
    const nps = parseInt(answers['4'] || 0, 10);
    const isSalesRecommended = nps >= 7 || nps === 0;
    let summaryTitle = "Neutraali palaute";
    let summaryColor = "bg-[#fdf2f2] border-[#fde8e8] text-stone-800";
    let scriptText = "Kiitos palautteestasi, miten voisimme palvella paremmin?";

    if (nps >= 9) {
        summaryTitle = "Erinomainen tulos!";
        summaryColor = "bg-[#f0fdf4] border-[#dcfce7] text-[#22543d]";
        scriptText = "Ihana kuulla, että olet ollut tyytyväinen. Välitän palautteesi eteenpäin!";
    } else if (nps <= 6 && nps > 0) {
        summaryTitle = "Korjaava toimenpide tarvitaan";
        summaryColor = "bg-orange-100 border-orange-300 text-orange-900";
        scriptText = "Olemme pahoillamme, että kaikki ei ole mennyt täysin odotusten mukaisesti. Miten voisimme korjata asian?";
    }

    return { summaryTitle, summaryColor, scriptText, isSalesRecommended };
}

// --- MAIN APP COMPONENT ---
export default function App() {
    // Auth & Identity State
    const [fbUser, setFbUser] = useState(null);
    const [authSession, setAuthSession] = useState(null); // Simulator session
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    // View State
    const [currentView, setCurrentView] = useState('simulator_login'); 
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // For navigating weeks
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    // Global / Region Data State
    const [publicData, setPublicData] = useState({ products: FALLBACK_PRODUCTS, scripts: FALLBACK_SCRIPTS, masterTray: DEFAULT_TRAY_TASKS });
    const [allUserStats, setAllUserStats] = useState([]); 
    const [allGlobalStats, setAllGlobalStats] = useState([]);
    const [statsLoaded, setStatsLoaded] = useState(false);
    
    // Personal User Data State
    const [userMemos, setUserMemos] = useState([]);
    const [myTasks, setMyTasks] = useState([]); // Seller's personal weekly list
    const [userCustomTray, setUserCustomTray] = useState([]); // Seller's custom tray items
    const [userHiddenMasterTasks, setUserHiddenMasterTasks] = useState([]); // Hidden global tray items
    const [userProducts, setUserProducts] = useState([]); // User's customized products
    const [hiddenMasterProducts, setHiddenMasterProducts] = useState([]); // Hidden global products
    const [marketingPlans, setMarketingPlans] = useState([]); // Marketing plans
    const [financialStatements, setFinancialStatements] = useState([]); // Financial statements

    // UI Modals & Inputs
    const [modals, setModals] = useState({ sales: false, adminPlan: false, editTask: false, editTrayTask: false, newTrayTask: false, bonuses: false, salaryDetails: false, historyEntry: false, activityHistory: null });
    const [customSalesHours, setCustomSalesHours] = useState("");
    const [saleMode, setSaleMode] = useState('oneTime');
    const [adminBonuses, setAdminBonuses] = useState({ oneTimeRate: 10, ongoingRate: 30, customerBonus: 50 });
    const [editingPlanTasks, setEditingPlanTasks] = useState([]); 
    const [expandedProductId, setExpandedProductId] = useState(null);
    const [isEditingTheme, setIsEditingTheme] = useState(false);
    const [editThemeData, setEditThemeData] = useState({ theme: "", tip: "" });
    const [selectedUserReport, setSelectedUserReport] = useState(null);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showLevelsInfo, setShowLevelsInfo] = useState(false);
    const [taskCompletionTab, setTaskCompletionTab] = useState('oma');
    const [isGeneratingRecording, setIsGeneratingRecording] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Uudet tilat palkkioraporttiin
    const [reportTab, setReportTab] = useState('katsaus');
    const [selectedArchiveMonth, setSelectedArchiveMonth] = useState("");
    const [payoutBonusAmount, setPayoutBonusAmount] = useState({});
    const [payoutBonusNote, setPayoutBonusNote] = useState({});
    
    // History Data Entry (Aluevetäjä)
    const [historyEntry, setHistoryEntry] = useState({ month: new Date().toISOString().slice(0, 7), hours: "", target: "", revenue: "", revenueTarget: "" });
    
    
    // Marketing Plans & Financial Statements State
    const [marketingModal, setMarketingModal] = useState(false);
    const [financialModal, setFinancialModal] = useState(false);
    const [editingFinancialStatement, setEditingFinancialStatement] = useState(null);
    const [editingMarketingPlan, setEditingMarketingPlan] = useState({
        id: '', year: new Date().getFullYear(), quarter: Math.floor((new Date().getMonth() + 3) / 3),
        targetMo1: '', targetMo2: '', targetMo3: '',
        targetRev1: '', targetRev2: '', targetRev3: '',
        budgetPrint: '', budgetDigital: '', budgetEdustus: '', budgetOther: '',
        evaluation: '',
        selectedTasks: [] // { id, trayTaskId, type: 'pinned' | 'week', targetWeekNum: X }
    });
    const [marketingTaskDraft, setMarketingTaskDraft] = useState({ trayTaskId: '', type: 'pinned', targetWeekNum: '' });

    // Task Editing States
    const [editingTaskIdx, setEditingTaskIdx] = useState(null);
    const [editingTaskText, setEditingTaskText] = useState("");
    const [editingTrayTask, setEditingTrayTask] = useState({ id: '', text: '', isMaster: false });
    const [newTrayTaskText, setNewTrayTaskText] = useState("");

    // Survey State
    const [surveyState, setSurveyState] = useState({
        step: 'login', worker: '', clientInitials: '', sessionId: '', answers: {}, serviceRatings: {}, proposalStatus: 'none', planHours: 0, oneOffHours: 0, salesNote: '', calculatedBonus: '0.00', isSubmitting: false
    });

    const isAdmin = authSession?.role === 'admin' || authSession?.role === 'superadmin';
    const isSuperAdmin = authSession?.role === 'superadmin';
    const activeRegions = Array.isArray(publicData.regions) && publicData.regions.length > 0 ? publicData.regions : FALLBACK_REGIONS;

    // Unified Tray Computation
    const masterTray = Array.isArray(publicData.masterTray) ? publicData.masterTray : DEFAULT_TRAY_TASKS;
    const safeUserHiddenTasks = Array.isArray(userHiddenMasterTasks) ? userHiddenMasterTasks : [];
    const safeUserCustomTray = Array.isArray(userCustomTray) ? userCustomTray : [];
    
    const unifiedTray = [
        ...masterTray.filter(t => t && t.id && !safeUserHiddenTasks.includes(t.id)).map(t => ({...t, isMaster: true})),
        ...safeUserCustomTray.map(t => ({...t, isMaster: false}))
    ];

    // Unified Products Computation
    const masterProducts = Array.isArray(publicData.products) ? publicData.products : FALLBACK_PRODUCTS;
    const safeHiddenMasterProducts = Array.isArray(hiddenMasterProducts) ? hiddenMasterProducts : [];
    const safeUserProducts = Array.isArray(userProducts) ? userProducts : [];

    const unifiedProducts = [
        ...masterProducts.filter(p => p && p.id && !safeHiddenMasterProducts.includes(p.id)).map(p => ({...p, isMaster: true})),
        ...safeUserProducts.map(p => ({...p, isMaster: false}))
    ];

    // 1. Initial Auth setup
    useEffect(() => {
        const SUPER_ADMINS = ['heikki.laivamaa@famula.fi', 'paulus.linnanmaki@famula.fi'];
        
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setFbUser(u);
                if (!authSession) {
                    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', u.uid);
                    // Use onSnapshot so if admin approves them, their session updates
                    onSnapshot(userRef, (userDocSnap) => {
                        let role = 'myyja';
                        let regionId = null;
                        let name = u.displayName || u.email || 'Käyttäjä';
                        let status = 'pending';
                        let hasData = false;
                        
                        let dbStatus = null;
                        
                        if (userDocSnap && userDocSnap.exists()) {
                            hasData = true;
                            const d = userDocSnap.data();
                            if (d.role) role = d.role;
                            if (d.regionId) regionId = d.regionId;
                            if (d.name) name = d.name;
                            if (d.status) status = d.status;
                            if (d.status) dbStatus = d.status;
                        }

                        // Hardcoded override
                        if (u.email && SUPER_ADMINS.includes(u.email.toLowerCase())) {
                            role = 'superadmin';
                            status = 'active';
                            dbStatus = 'active';
                        }
                        
                        setAuthSession({ name, role, regionId, realRole: role, realRegionId: regionId, status, email: u.email, hasData, dbStatus });
                        
                        if (status === 'active') {
                            setCurrentView(prev => prev === 'pending_access' || prev === 'simulator_login' ? 'portal' : prev);
                        } else {
                            setCurrentView('pending_access');
                        }
                    }, (err) => {
                        console.error('Session listener error:', err);
                    });
                }
            } else {
                setFbUser(null);
                setAuthSession(null);
                setCurrentView((authSession && authSession.status === 'active') ? 'portal' : 'simulator_login');
            }
            setIsAuthenticating(false);
        });
        return unsub;
    }, []);

    // 2. Fetch Data based on Simulator Session
    useEffect(() => {
        if (!authSession || !fbUser) return;

        const regionId = authSession.regionId;

        // Fetch Global Tools & Master Tray
        const toolsRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalData', 'main');
        const unsubTools = onSnapshot(toolsRef, (docSnap) => {
            if (docSnap.exists()) setPublicData(docSnap.data());
        }, (err) => console.error("Global data snap error:", err));

        // Fetch Marketing Plans
        const marketingRef = collection(db, 'artifacts', appId, 'public', 'data', 'marketing_plans');
        const unsubMarketing = onSnapshot(marketingRef, (snap) => {
            const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setMarketingPlans(plans);
        }, (err) => console.error("Marketing snap error:", err));

        // Fetch Financial Statements
        const financialRef = collection(db, 'artifacts', appId, 'public', 'data', 'financial_statements');
        const unsubFinancial = onSnapshot(financialRef, (snap) => {
            const stmts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setFinancialStatements(stmts);
        }, (err) => console.error("Financial statements snap error:", err));

        // Fetch All Users Stats for the Region (and Global if superadmin)
        const statsRef = collection(db, 'artifacts', appId, 'public', 'data', 'user_stats');
        const unsubStats = onSnapshot(statsRef, (snap) => {
            const rawStats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (authSession.role === 'superadmin') setAllGlobalStats(rawStats);
            
            const stats = rawStats.filter(s => s.regionId === regionId);
            setAllUserStats(stats);
            setStatsLoaded(true);
            
            const myStatDoc = stats.find(s => s.id === fbUser.uid);
            if (myStatDoc && myStatDoc.myTasks) {
                setMyTasks(myStatDoc.myTasks);
            } else {
                setMyTasks([]);
            }
        }, (err) => console.error("Stats snap error:", err));

        // Fetch Personal Data (Memos, Custom Tray, Hidden Master Tasks)
        const privRef = doc(db, 'artifacts', appId, 'users', fbUser.uid, 'privateData', 'main');
        const unsubPriv = onSnapshot(privRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserMemos(data.memos || []);
                setUserCustomTray(data.customTray || []);
                setUserHiddenMasterTasks(data.hiddenMasterTasks || []);
                setUserProducts(data.userProducts || []);
                setHiddenMasterProducts(data.hiddenMasterProducts || []);
            }
        }, (err) => console.error("Private snap error:", err));

        return () => { unsubTools(); unsubStats(); unsubPriv(); unsubMarketing(); };
    }, [authSession, fbUser]);

    // Ensure my stats doc exists initially, or process an invitation.
    useEffect(() => {
        if (!fbUser || !statsLoaded) return;

        // 1. Process potential email invitations
        const existingInvite = allUserStats.find(s => s.isInvite && s.email?.toLowerCase() === fbUser.email?.toLowerCase());
        
        if (existingInvite) {
            import('firebase/firestore').then(({ deleteDoc, doc }) => {
                deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', existingInvite.id));
            });
            const { id: _, isInvite: __, ...inviteData } = existingInvite;
            syncMyStats({ ...inviteData, status: 'active', hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] });
            showToast(`Kutsu tunnistettu! Tervetuloa alueelle ${inviteData.regionId}.`);
            return;
        }

        // 2. Ensure active users have the base data row
        if (authSession && authSession.status === 'active') {
            const exists = allUserStats.find(s => s.id === fbUser.uid);
            if (!exists && allUserStats.length >= 0) { 
                syncMyStats({ hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] });
            }
        }
    }, [authSession, fbUser, allUserStats, statsLoaded]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const handleSimulatorLogin = (e) => {
        e.preventDefault();
        const name = e.target.elements.nameInput?.value || "Testi";
        const regionId = e.target.elements.regionSelect?.value || "uusimaa";
        const role = e.target.elements.roleSelect?.value || "myyja";
        setAuthSession({ name, role, regionId, realRole: role, realRegionId: regionId });
        setCurrentView('portal');
        showToast(`Tervetuloa kehitystilaan ${name}!`);
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (e) {
            console.error(e);
            showToast("Kirjautuminen epäonnistui", "error");
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setAuthSession(null);
        setCurrentView((authSession && authSession.status === 'active') ? 'portal' : 'simulator_login');
    };

    // --- DATA ACTIONS ---
    
    const syncMyStats = (updates) => {
        if (!authSession || !fbUser) return;
        const currentMyStat = allUserStats.find(s => s.id === fbUser.uid) || { hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] };
        const merged = { ...currentMyStat, name: authSession.name, regionId: authSession.regionId, ...updates };

        setAllUserStats(prev => {
            const exists = prev.find(s => s.id === fbUser.uid);
            if (exists) return prev.map(s => s.id === fbUser.uid ? merged : s);
            return [...prev, { id: fbUser.uid, ...merged }];
        });
        if (updates.myTasks) setMyTasks(updates.myTasks);

        try {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', fbUser.uid), merged, { merge: true }).catch(e => console.warn(e));
        } catch(e) { console.warn('Mock DB block:', e); }
    };

    const updatePrivateDoc = (updates) => {
        if (!fbUser) return;

        if (updates.memos) setUserMemos(updates.memos);
        if (updates.customTray) setUserCustomTray(updates.customTray);
        if (updates.hiddenMasterTasks) setUserHiddenMasterTasks(updates.hiddenMasterTasks);

        try {
            setDoc(doc(db, 'artifacts', appId, 'users', fbUser.uid, 'privateData', 'main'), updates, { merge: true }).catch(e => console.warn(e));
        } catch(e) {}
    };

    // MY DESKTOP TASKS (Home)
    const toggleMyTaskCheck = (taskId, isMarketingTask = false, taskObj = null) => {
        const todayInfo = getTodayInfo(currentWeekOffset * 7);
        const currentWeekId = `${todayInfo.year}-${todayInfo.weekNum}`;
        const myStat = allUserStats.find(s => s.id === fbUser?.uid) || { logs: [] };
        const updatedLogs = [...(myStat.logs || [])];

        if (isMarketingTask && taskObj) {
            const mktDoneLog = myStat.marketingTasksDone || [];
            let newMktDone = [...mktDoneLog];
            const checkKey = taskObj.type === 'pinned' ? `${taskId}_${currentWeekId}` : taskId;
            
            if (newMktDone.includes(checkKey)) {
                newMktDone = newMktDone.filter(k => k !== checkKey);
            } else {
                newMktDone.push(checkKey);
                updatedLogs.push({ id: generateId(), timestamp: Date.now(), type: 'task_done', taskText: taskObj.text });
            }
            syncMyStats({ logs: updatedLogs, marketingTasksDone: newMktDone });
            return;
        }

        const updatedTasks = myTasks.map(t => {
            if (t.id !== taskId) return t;
            let isNowDone = false;
            
            if (t.type === 'pinned') {
                const doneWeeks = t.doneWeeks || [];
                isNowDone = !doneWeeks.includes(currentWeekId);
                if (isNowDone) updatedLogs.push({ id: generateId(), timestamp: Date.now(), type: 'task_done', taskText: t.text });
                return {
                    ...t,
                    doneWeeks: isNowDone ? [...doneWeeks, currentWeekId] : doneWeeks.filter(w => w !== currentWeekId)
                };
            }
            
            isNowDone = !t.done;
            if (isNowDone) updatedLogs.push({ id: generateId(), timestamp: Date.now(), type: 'task_done', taskText: t.text });
            return { ...t, done: isNowDone };
        });
        syncMyStats({ myTasks: updatedTasks, logs: updatedLogs });
    };

    const deleteMyTask = (taskId) => {
        const updatedTasks = myTasks.filter(t => t.id !== taskId);
        syncMyStats({ myTasks: updatedTasks });
    };

    const saveEditedMyTask = () => {
        if (editingTaskText.trim() === '') return;
        const updatedTasks = myTasks.map(t => t.id === editingTaskIdx ? { ...t, text: editingTaskText } : t);
        syncMyStats({ myTasks: updatedTasks });
        setModals(prev => ({ ...prev, editTask: false }));
        setEditingTaskIdx(null);
        setEditingTaskText("");
    };

    const pickTaskToHome = (text) => {
        const todayInfo = getTodayInfo(currentWeekOffset * 7);
        const newTasks = [{ id: generateId(), text: text, type: 'weekly', targetWeekId: `${todayInfo.year}-${todayInfo.weekNum}`, done: false }];
        syncMyStats({ myTasks: [...myTasks, ...newTasks] });
        showToast("Siirretty viikolle!");
    };
    
    const pinTaskToHome = (text) => {
        const newTasks = [{ id: generateId(), text: text, type: 'pinned', doneWeeks: [] }];
        syncMyStats({ myTasks: [...myTasks, ...newTasks] });
        showToast("Kiinnitetty toistuvaksi!");
    };

    // TRAY MANAGEMENT (Tools Page)
    const saveEditedTrayTask = async () => {
        if (editingTrayTask.text.trim() === '') return;
        
        if (editingTrayTask.isMaster) {
            // Hide the master task and create a custom copy
            await updatePrivateDoc({
                hiddenMasterTasks: [...userHiddenMasterTasks, editingTrayTask.id],
                customTray: [...userCustomTray, { id: generateId(), text: editingTrayTask.text }]
            });
        } else {
            // Just update the custom task
            await updatePrivateDoc({
                customTray: userCustomTray.map(t => t.id === editingTrayTask.id ? { ...t, text: editingTrayTask.text } : t)
            });
        }
        setModals(prev => ({ ...prev, editTrayTask: false }));
        showToast("Tavoite muokattu onnistuneesti!");
    };

    const deleteTrayTask = async (id, isMaster) => {
        if (isMaster) {
            await updatePrivateDoc({ hiddenMasterTasks: [...userHiddenMasterTasks, id] });
        } else {
            await updatePrivateDoc({ customTray: userCustomTray.filter(t => t.id !== id) });
        }
        showToast("Tavoite poistettu tarjottimelta.");
    };

    const saveNewTrayTask = async () => {
        if (newTrayTaskText.trim() === '') return;
        await updatePrivateDoc({
            customTray: [...userCustomTray, { id: generateId(), text: newTrayTaskText.trim() }]
        });
        setNewTrayTaskText("");
        setModals(prev => ({ ...prev, newTrayTask: false }));
        showToast("Uusi tavoite lisätty tarjottimelle!");
    };

    // SUPER ADMIN TRAY (Master Library)
    const openAdminTrayModal = () => {
        setEditingPlanTasks(publicData.masterTray || DEFAULT_TRAY_TASKS);
        setModals(prev => ({ ...prev, adminPlan: true }));
    };

    const updatePlanTask = (taskId, val) => {
        setEditingPlanTasks(prev => prev.map(t => t.id === taskId ? { ...t, text: val } : t));
    };

    const removePlanTask = (taskId) => {
        setEditingPlanTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const addPlanTask = () => {
        setEditingPlanTasks(prev => [...prev, { id: generateId(), text: 'Uusi valtakunnallinen tavoite' }]);
    };

    const applyGrowthTemplate = (templateId) => {
        const t = GROWTH_TEMPLATES.find(x => x.id === templateId);
        if (t) {
            setEditingPlanTasks(t.tasks.map(text => ({ id: generateId(), text })));
        }
    };

    const saveAdminPlan = () => {
        const cleanedTasks = editingPlanTasks.filter(t => t.text && t.text.trim() !== '');
        const newData = { ...publicData, masterTray: cleanedTasks };
        setPublicData(newData);
        try { setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalData', 'main'), newData, { merge: true }).catch(e=>console.warn(e)); } catch(e) {}
        setModals(prev => ({ ...prev, adminPlan: false }));
        showToast("Valtakunnallinen tarjotin päivitetty!");
    };

    const saveRegionBonuses = () => {
        const updatedRegionBonuses = { ...(publicData.regionBonuses || {}), [authSession.regionId]: adminBonuses };
        updatePublicDataProps({ regionBonuses: updatedRegionBonuses });
        setModals(prev => ({ ...prev, bonuses: false }));
        showToast("Alueen komissiot tallennettu!");
    };

    const handleVoiceRecordMock = () => {
        if (isGeneratingRecording) return;
        setIsGeneratingRecording(true);
        setTimeout(() => {
            setIsGeneratingRecording(false);
            const myStatDoc = allUserStats.find(s => s.id === fbUser?.uid) || { hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] };
            const newLog = {
                id: generateId(),
                type: 'survey',
                nps: 10,
                feedback: 'Sanelumuistio ja myynti.',
                clientInitials: 'T.K.',
                timestamp: Date.now()
            };
            syncMyStats({
                ...myStatDoc,
                npsSum: (myStatDoc.npsSum || 0) + 10,
                npsCount: (myStatDoc.npsCount || 0) + 1,
            }, newLog);
            showToast("Sparraaja purki sanelun! Kirjattu 10 NPS asiakkaalle.", "success");
        }, 3000);
    };

    // MEMOS (Private)
    const addMemo = async (e) => {
        e.preventDefault();
        const text = e.target.elements.memoInput.value;
        if (text.trim() && fbUser) {
            const newMemos = [{ id: Date.now(), text, date: new Date().toLocaleDateString('fi-FI') }, ...userMemos];
            await updatePrivateDoc({ memos: newMemos });
            e.target.reset();
            showToast("Muistio tallennettu");
        }
    };
    
    const deleteMemo = async (id) => {
        if (!fbUser) return;
        const newMemos = userMemos.filter(m => m.id !== id);
        await updatePrivateDoc({ memos: newMemos });
    };

    // GLOBAL TOOLS (Products & Scripts)
const updatePublicDataProps = (updates) => {
        if (!authSession || (authSession.role !== 'admin' && authSession.role !== 'superadmin')) return;
        const newData = { ...publicData, ...updates };
        setPublicData(newData);
        try { setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalData', 'main'), newData, { merge: true }).catch(e=>console.warn(e)); } catch(e) {}
    };

    const addManualBonusToUser = async (userId) => {
        const amount = payoutBonusAmount[userId];
        const note = payoutBonusNote[userId];
        if (!amount || isNaN(amount)) return;
        const myStat = allUserStats.find(s => s.id === userId);
        if (!myStat) return;
        const newLog = { 
            id: generateId(), 
            timestamp: Date.now(), 
            type: 'manual_bonus', 
            amount: Number(amount), 
            note: note || 'Manuaalinen lisä/vähennys' 
        };
        const updatedLogs = [...(myStat.logs || []), newLog];
        try {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', userId), { logs: updatedLogs }, { merge: true });
            setPayoutBonusAmount(prev => ({...prev, [userId]: ""}));
            setPayoutBonusNote(prev => ({...prev, [userId]: ""}));
        } catch(e) {}
    };

    const markPayoutsAsPaid = async (computedPayouts, totalBonusSum) => {
        if (!authSession || !isAdmin) return;
        if (!window.confirm("Kuitataanko kuluva avoin kausi maksetuksi? Näiden kirjausten tiedot lukitaan Maksuarkistoon.")) return;
        
        const rId = authSession.regionId;
        const targetMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const archiveId = `payout_${Date.now()}`;
        
        const newArchiveEntry = {
            id: archiveId,
            month: targetMonth,
            timestamp: Date.now(),
            regionId: rId,
            totalSum: totalBonusSum,
            payouts: computedPayouts
        };
        
        const currentArchives = publicData.payoutArchives || {};
        const regionArchives = currentArchives[rId] || [];
        const updatedArchives = { ...currentArchives, [rId]: [newArchiveEntry, ...regionArchives] };
        updatePublicDataProps({ payoutArchives: updatedArchives });
        
        for (const userPayout of computedPayouts) {
            const userStat = allUserStats.find(s => s.id === userPayout.userId);
            if (userStat) {
                const updatedLogs = (userStat.logs || []).map(log => {
                    if (!log.payoutId && userPayout.logs.find(l => l.id === log.id)) {
                        return { ...log, payoutId: archiveId };
                    }
                    return log;
                });
                try {
                    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', userPayout.userId), { logs: updatedLogs }, { merge: true });
                } catch(e) {}
            }
        }
    };

    const saveHistoryEntry = () => {
        if (!authSession || (!isAdmin && !isSuperAdmin)) return;
        const currentHistory = publicData.regionHistory || {};
        const regionH = currentHistory[authSession.regionId] || [];
        const newEntry = { id: generateId(), month: historyEntry.month, hours: Number(historyEntry.hours), target: Number(historyEntry.target) };
        
        const existingIdx = regionH.findIndex(h => h.month === newEntry.month);
        let updatedRegionH;
        if (existingIdx >= 0) {
            updatedRegionH = [...regionH];
            updatedRegionH[existingIdx] = newEntry;
        } else {
            updatedRegionH = [...regionH, newEntry];
        }
        
        updatePublicDataProps({ regionHistory: { ...currentHistory, [authSession.regionId]: updatedRegionH } });
        setHistoryEntry({ ...historyEntry, hours: "", target: "" });
        showToast("Laskutetut tunnit ja tavoite tallennettu aikasarjaan!");
    };

    const updateProductField = async (id, field, val, isMaster) => {
        if (isMaster && isAdmin) {
            updatePublicDataProps({ products: (publicData.products || []).map(p => p.id === id ? { ...p, [field]: val } : p) });
        } else if (!isMaster) {
            await updatePrivateDoc({ userProducts: userProducts.map(p => p.id === id ? { ...p, [field]: val } : p) });
        }
    };
    
    const deleteProduct = async (id, isMaster) => {
        if (isMaster) {
            if (isAdmin && window.confirm("Poistetaanko tämä MASTER-kortti pysyvästi kaikilta käyttäjiltä (OK), vai piilotetaanko vain omalta tarjottimeltasi (Cancel)?")) {
                updatePublicDataProps({ products: (publicData.products || []).filter(p => p.id !== id) });
                showToast("Master-toimintakortti poistettu kaikilta tuotannosta");
            } else {
                await updatePrivateDoc({ hiddenMasterProducts: [...hiddenMasterProducts, id] });
                showToast("Master-kortti piilotettu omalta tarjottimeltasi");
            }
        } else {
            if(window.confirm("Poistetaanko oma muokattu korttisi?")) {
                await updatePrivateDoc({ userProducts: userProducts.filter(p => p.id !== id) });
                showToast("Oma kortti poistettu");
            }
        }
    };

    const duplicateMasterProduct = async (product) => {
        const newId = Date.now();
        const copy = { ...product, id: newId };
        await updatePrivateDoc({ 
            userProducts: [...userProducts, copy],
            hiddenMasterProducts: [...hiddenMasterProducts, product.id]
        });
        setExpandedProductId(newId);
        showToast("Kopioitu omaksi versioksi! Voit nyt muokata sitä.");
    };

    const addNewProduct = async () => {
        const newProduct = { id: Date.now(), title: "Uusi Tuote", icon: "Star", content: "Muokkaa sisältöä...", pitch: "Myyntilause..." };
        if (isAdmin && window.confirm("Haluatko lisätä kaikille näkyvän yhteisen Master-kortin (OK) vai vain henkilökohtaisen kortin (Cancel)?")) {
            updatePublicDataProps({ products: [...(publicData.products || []), newProduct] });
        } else {
            await updatePrivateDoc({ userProducts: [...userProducts, newProduct] });
        }
        setExpandedProductId(newProduct.id);
        showToast("Uusi kortti lisätty salkkuun!");
    };

    // SALES & SURVEY
    const handleRecordSale = (hours) => {
        if (!fbUser) return;
        const myStat = allUserStats.find(s => s.id === fbUser.uid) || { hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] };
        const newLog = { id: generateId(), timestamp: Date.now(), type: 'quick_sale', hours: hours, saleMode: saleMode };
        syncMyStats({ hours: myStat.hours + hours, logs: [...(myStat.logs || []), newLog] });
        showToast(`Kirjattu: ${hours}h ${saleMode === 'oneTime' ? 'irtotunteja' : 'jatkuvaa tilausta'}!`);
        setModals(prev => ({ ...prev, sales: false }));
    };

    const handleRecordQuickCustomer = () => {
        if (!fbUser) return;
        const myStat = allUserStats.find(s => s.id === fbUser.uid) || { hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] };
        const newLog = { id: generateId(), timestamp: Date.now(), type: 'quick_customer', customers: 1 };
        syncMyStats({ customers: (myStat.customers || 0) + 1, logs: [...(myStat.logs || []), newLog] });
        showToast("1 Uusi asiakas kirjattu (ja maksuperuste aktivoitu)!");
    };

    const handleUndoLog = (userId, logId) => {
        if (!window.confirm("Haluatko varmasti peruuttaa ja poistaa tämän tapahtuman tilastoista kokonaan?")) return;
        
        const myStat = allUserStats.find(s => s.id === userId);
        if (!myStat) return;
        
        const logToRemove = (myStat.logs || []).find(l => l.id === logId);
        if (!logToRemove) return;
        
        const isSurvey = logToRemove.type === 'survey';
        let newHours = myStat.hours || 0;
        let newCustomers = myStat.customers || 0;
        let newNpsSum = myStat.npsSum || 0;
        let newNpsCount = myStat.npsCount || 0;
        
        if (logToRemove.type === 'quick_sale') {
            newHours -= (logToRemove.hours || 0);
        } else if (logToRemove.type === 'quick_customer') {
            newCustomers -= 1;
        } else if (isSurvey) {
            newHours -= (logToRemove.hours || 0);
            if (logToRemove.proposalStatus === 'sold') {
               newCustomers -= 1;
            }
            if (logToRemove.nps > 0) {
                newNpsSum -= logToRemove.nps;
                newNpsCount -= 1;
            }
        }
        
        newHours = Math.max(0, newHours);
        newCustomers = Math.max(0, newCustomers);
        newNpsSum = Math.max(0, newNpsSum);
        newNpsCount = Math.max(0, newNpsCount);
        
        const newLogs = (myStat.logs || []).filter(l => l.id !== logId);
        
        const updates = {
            hours: newHours,
            customers: newCustomers,
            npsSum: newNpsSum,
            npsCount: newNpsCount,
            logs: newLogs
        };
        
        // We use setDoc instead of syncMyStats directly, so Superadmin can undo others' logs too
        const targetRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', userId);
        setDoc(targetRef, updates, { merge: true });
        showToast("Tapahtuma ja siihen liittyvät tilastot peruutettiin!");
        
        // If my own log was removed and I'm currently viewing history, it just updates automatically via snapshot!
    };

    const handleStartSurveyView = () => {
        setSurveyState({
            step: 'login', worker: authSession?.name || '', clientInitials: '', sessionId: '', answers: {}, serviceRatings: {}, proposalStatus: 'none', planHours: 0, oneOffHours: 0, salesNote: '', calculatedBonus: '0.00', isSubmitting: false
        });
        setCurrentView('survey');
    };

    const submitSurvey = async () => {
        setSurveyState(prev => ({ ...prev, isSubmitting: true }));
        const totalHours = surveyState.planHours + surveyState.oneOffHours;
        const totalBonus = ((Math.min(surveyState.planHours, 2) * 39.95) + (surveyState.oneOffHours * 5.00)).toFixed(2);
        
        if (fbUser) {
            const myStat = allUserStats.find(s => s.id === fbUser.uid) || { hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: [] };
            const npsVal = surveyState.answers['4'] || 0;
            const newLog = {
                id: generateId(), timestamp: Date.now(), type: 'survey',
                clientInitials: surveyState.clientInitials || '?',
                hours: totalHours, 
                planHours: surveyState.planHours || 0,
                oneOffHours: surveyState.oneOffHours || 0,
                nps: npsVal, answers: surveyState.answers,
                proposalStatus: surveyState.proposalStatus
            };
            
            syncMyStats({
                hours: myStat.hours + totalHours,
                customers: surveyState.proposalStatus === 'sold' ? myStat.customers + 1 : myStat.customers,
                npsSum: myStat.npsSum + npsVal,
                npsCount: myStat.npsCount + (npsVal > 0 ? 1 : 0),
                logs: [...(myStat.logs || []), newLog]
            });
        }

        setTimeout(() => setSurveyState(prev => ({ ...prev, step: 'success', calculatedBonus: totalBonus, isSubmitting: false })), 800);
    };

    // --- RENDER VIEWS ---
    if (isAuthenticating) return <div className="min-h-screen bg-[#e7e5e4] flex items-center justify-center"><Loader2 className="animate-spin text-[#9b2c2c] w-12 h-12"/></div>;

    const renderSimulatorLogin = () => (
        <div className="min-h-screen bg-[#e7e5e4] flex flex-col items-center justify-center p-4">
            <div className="bg-[#f5f5f4] p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden border border-stone-200 text-center">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#9b2c2c] to-[#2f855a]"></div>
                <h1 className="text-4xl font-black text-stone-900 mb-2 mt-4 tracking-tighter">Famula</h1>
                <p className="text-stone-500 mb-8 text-sm font-medium tracking-wide">Kirjaudu sisään ammattilaisena.</p>
                <button onClick={handleGoogleLogin} className="w-full bg-[#22543d] text-white rounded-2xl py-4 font-bold hover:bg-[#132e21] transition-all flex items-center justify-center shadow-lg active:scale-95 mb-4">
                    Kirjaudu Googlella <ArrowRight className="ml-2 w-5 h-5"/>
                </button>
            </div>
        </div>
    );

    const handleApplyAccess = async (e) => {
        e.preventDefault();
        const role = e.target.elements.roleSelect.value;
        const regionId = e.target.elements.regionSelect.value;
        const name = e.target.elements.nameInput.value;
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', fbUser.uid), {
            name: name,
            email: fbUser.email,
            requestedRole: role,
            regionId: regionId,
            status: 'pending',
            role: 'myyja', // Always save initial underlying role safely
            hours: 0, customers: 0, npsSum: 0, npsCount: 0, myTasks: []
        }, { merge: true });
        
        setAuthSession(prev => ({...prev, status: 'pending', regionId}));
        showToast("Hakemus lähetetty johtajalle!", "success");
    };

    const renderPendingAccess = () => {
        const isAlreadyApplied = authSession?.dbStatus === 'pending';
        return (
            <div className="min-h-screen bg-[#e7e5e4] flex flex-col items-center justify-center p-4">
                <div className="bg-[#f5f5f4] p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden border border-stone-200">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#9b2c2c] to-[#2f855a]"></div>
                    <div className="flex justify-between items-center mb-6 mt-4">
                        <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Famula</h1>
                        <div className="flex gap-4">
                            <button onClick={() => setCurrentView((authSession && authSession.status === 'active') ? 'portal' : 'simulator_login')} className="text-stone-400 hover:text-[#2f855a] transition-colors"><Home size={20}/></button>
                            <button onClick={handleLogout} className="text-stone-400 hover:text-[#9b2c2c] transition-colors"><LogOut size={20}/></button>
                        </div>
                    </div>
                    
                    {isAlreadyApplied ? (
                        <div className="text-center py-6 animate-fade-in">
                            <Clock className="w-16 h-16 text-stone-400 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-stone-800 mb-2">Odottaa hyväksyntää</h2>
                            <p className="text-stone-500 text-sm leading-relaxed">
                                Hakemuksesi alueelle <b>{activeRegions.find(r=>r.id===authSession?.regionId)?.name}</b> on lähetetty! 
                                Pääset sisään työpöydälle heti kun ohjaaja on kuitannut roolisi aktiiviseksi.
                            </p>
                            <div className="flex flex-col items-center gap-3 mt-8">
                                <button onClick={()=>window.location.reload()} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-stone-800 active:scale-95 transition-all w-full">Päivitä sivu</button>
                                <button onClick={() => {
                                    import('firebase/firestore').then(({ deleteDoc, doc }) => {
                                        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', fbUser.uid));
                                    });
                                }} className="text-[#9b2c2c] font-bold text-xs uppercase tracking-wider hover:opacity-70 transition-opacity">Peruuta ja muuta hakemusta</button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <p className="text-stone-500 mb-6 text-sm font-medium tracking-wide">Uusi käyttäjä! Pyydä oikeudet tiimin sovellukseen täyttämällä tiedot.</p>
                            <form onSubmit={handleApplyAccess} className="space-y-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Koko nimesi</label>
                                    <input type="text" name="nameInput" required defaultValue={fbUser?.displayName || ''} className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#2f855a]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Mille alueelle haet?</label>
                                    <select name="regionSelect" required className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#2f855a]">
                                        <option value="">-- Valitse alueasiakkuus --</option>
                                        {activeRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Mitä roolia haet?</label>
                                    <select name="roleSelect" required className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#2f855a]">
                                        <option value="myyja">Myyjä</option>
                                        <option value="admin">Aluevetäjä</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-[#22543d] text-white rounded-2xl py-4 font-bold hover:bg-[#132e21] transition-all flex items-center justify-center shadow-lg active:scale-95 mt-4">
                                    Lähetä hakemus <ChevronRight className="ml-2 w-5 h-5"/>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUserProfile = () => {
        // Collect users to display depending on role
        const statsSource = authSession?.role === 'superadmin' ? (allGlobalStats?.length > 0 ? allGlobalStats : allUserStats) : allUserStats;
        const usersToManage = (Array.isArray(statsSource) ? statsSource : []).filter(u => {
            if (u.status === 'pending' || u.status === 'active') {
                if (isSuperAdmin) return true;
                if (isAdmin && !isSuperAdmin) return u.regionId === authSession.regionId && (u.role === 'myyja' || u.requestedRole === 'myyja');
                return false;
            }
            return false;
        });

        const pendingUsers = usersToManage.filter(u => u.status === 'pending');
        const activeUsers = usersToManage.filter(u => u.status === 'active' && u.id !== fbUser?.uid);

        const handleApprove = async (uid, reqRole) => {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', uid), { status: 'active', role: reqRole }, { merge: true });
            showToast("Käyttäjä hyväksytty!");
        };
        const handleAssignRole = async (uid, newRole) => {
            if(window.confirm("Muutetaanko roolia?")) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', uid), { role: newRole }, { merge: true });
                showToast("Rooli vaihdettu!");
            }
        };
        const handleAssignRegion = async (uid, newRegionId) => {
            if(window.confirm("Siirretäänkö työntekijä toiselle alueelle?")) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', uid), { regionId: newRegionId }, { merge: true });
                showToast("Alue vaihdettu!");
            }
        };
        const handleDelete = async (uid) => {
            if(window.confirm("Haluatko varmasti hylätä/poistaa käyttäjän? Saanti ohjelmaan evätään välittömästi.")) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', uid), { status: 'rejected' }, { merge: true });
                if (uid === fbUser?.uid) handleLogout();
            }
        };

        const handleInviteUser = async (e) => {
            e.preventDefault();
            const name = e.target.elements.inviteName.value.trim();
            const email = e.target.elements.inviteEmail.value.trim().toLowerCase();
            let regionId = authSession.regionId;
            if (isSuperAdmin) {
                regionId = e.target.elements.inviteRegion?.value || regionId;
            }
            const role = e.target.elements.inviteRole.value;

            if (!name || !email || !regionId) return;

            const inviteId = `invite_${email.replace(/[^a-z0-9]/g, '')}`;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_stats', inviteId), {
                name, email, regionId, role, status: 'active', isInvite: true
            });
            e.target.reset();
            showToast("Työntekijä kutsuttu! Hän pääsee sisään välittömästi kirjautuessaan.");
        };
        
        return (
            <div className="animate-fade-in">
                <header className="mb-4 mt-2 px-1"><h2 className="text-2xl font-black text-stone-900">{isAdmin ? 'Käyttäjähallinta' : 'Oma Profiili'}</h2></header>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-[#2f855a] text-xl font-bold">{fbUser?.displayName?.[0] || 'U'}</div>
                        <div>
                            <h3 className="font-bold text-lg text-stone-800">{fbUser?.displayName || authSession?.name}</h3>
                            <p className="text-stone-500 text-sm">{fbUser?.email}</p>
                            <div className="mt-2 flex gap-2">
                                <span className="bg-[#f0fdf4] text-[#22543d] px-2 py-1 rounded text-[10px] font-bold uppercase border border-[#dcfce7]">{authSession?.realRole}</span>
                                <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-stone-200">{authSession?.regionId}</span>
                            </div>
                        </div>
                    </div>
                    
                    {!isSuperAdmin && (
                        <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
                            <button onClick={()=>showToast("Pyyntö vetäjälle lähetetty (Demo)")} className="w-full text-left p-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-50 transition flex items-center justify-between">Ano siirtoa toiselle alueelle <ChevronRight size={16} className="text-stone-400"/></button>
                            {authSession?.role === 'admin' && <button onClick={()=>showToast("Pyyntö Superadminille lähetetty! (Demo)")} className="w-full text-left p-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-50 transition flex items-center justify-between">Ano Superadmin-oikeuksia <ChevronRight size={16} className="text-stone-400"/></button>}
                            
                            <button onClick={()=>handleDelete(fbUser.uid)} className="w-full p-3 rounded-xl border border-[#fde8e8] bg-[#fdf2f2] text-sm font-bold text-[#9b2c2c] hover:bg-[#fce8e8] transition flex items-center justify-center mt-4 text-center">Poista työntekijätili kanta-asiakasohjelmasta</button>
                        </div>
                    )}
                    
                    <button onClick={handleLogout} className="w-full text-center p-3 rounded-xl bg-stone-900 border border-stone-900 text-sm font-bold text-white shadow-md hover:bg-black transition flex items-center justify-center mt-6 gap-2"><LogOut size={16}/> Kirjaudu ulos</button>
                </div>

                {isAdmin && (
                    <div className="space-y-6 lg:col-span-1">
                        {pendingUsers.length > 0 && (
                            <div>
                                <h3 className="text-xs font-black uppercase text-[#9b2c2c] tracking-widest mb-3 px-1">Odottaa hyväksyntää ({pendingUsers.length})</h3>
                                <div className="space-y-3">
                                    {pendingUsers.map(u => (
                                        <div key={u.id} className="bg-[#fdf2f2] border border-[#fde8e8] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-stone-800 flex items-center gap-2">{u.name} <span className="px-2 py-0.5 rounded-full bg-white text-[#9b2c2c] text-[10px] border border-[#fde8e8]">{u.requestedRole || 'myyja'}</span></div>
                                                <div className="text-xs text-stone-500 mt-1">{u.email} • {activeRegions.find(r=>r.id===u.regionId)?.name}</div>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button onClick={()=>handleDelete(u.id)} className="flex-1 bg-white border border-[#fde8e8] text-[#9b2c2c] py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#fde8e8] transition">Hylkää</button>
                                                <button onClick={()=>handleApprove(u.id, u.requestedRole || 'myyja')} className="flex-1 bg-[#2f855a] text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm hover:bg-[#22543d] transition">Hyväksy</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {isSuperAdmin && reportTab === 'katsaus' && (
                            <div className="mb-8 bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-sm mt-6">
                                <h3 className="text-xs font-black uppercase text-[#facc15] tracking-widest mb-3">Hallitse alueita (Superadmin)</h3>
                                <div className="space-y-2">
                                    {activeRegions.map(r => (
                                        <div key={r.id} className="flex justify-between items-center bg-stone-800 p-2.5 px-3 rounded-xl border border-stone-700">
                                            <span className="text-white text-sm font-bold">{r.name}</span>
                                            <span className="text-[10px] text-stone-500 uppercase tracking-widest bg-stone-900 px-2 py-1 rounded-md">{r.id}</span>
                                        </div>
                                    ))}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-stone-800">
                                        <input type="text" id="newRegionNameInput" placeholder="Uuden alueen nimi..." className="flex-1 bg-stone-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#facc15] border border-stone-700 placeholder-stone-500"/>
                                        <button onClick={async () => {
                                            const input = document.getElementById('newRegionNameInput');
                                            const name = input.value.trim();
                                            if (!name) return;
                                            const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            const newRegions = [...activeRegions, { id: newId, name }];
                                            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalData', 'main'), { regions: newRegions }, { merge: true });
                                            input.value = "";
                                            showToast("Uusi alue lisätty!");
                                        }} className="bg-[#2f855a] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#22543d] transition shadow-sm whitespace-nowrap">Lisää alue</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="mb-8 bg-white border border-stone-200 rounded-3xl p-5 shadow-sm mt-6">
                            <div className="flex items-center mb-4"><span className="bg-[#2f855a] text-white p-1.5 rounded-lg mr-3 shadow-sm"><UserPlus size={16}/></span><h3 className="text-sm font-bold text-stone-800">Kutsu uusi työntekijä</h3></div>
                            <form onSubmit={handleInviteUser} className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="email" name="inviteEmail" required placeholder="Sähköpostiosoite (Gmail)" className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-[#2f855a]" />
                                    <input type="text" name="inviteName" required placeholder="Etunimi Sukunimi" className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-[#2f855a]" />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {isSuperAdmin && reportTab === 'katsaus' && (
                                        <select name="inviteRegion" required className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold text-stone-700 outline-none focus:border-[#2f855a]">
                                            <option value="">-- Valitse alue --</option>
                                            {activeRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    )}
                                    <select name="inviteRole" required className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold text-stone-700 outline-none focus:border-[#2f855a]">
                                        <option value="myyja">Myyjä</option>
                                        <option value="admin">Aluevetäjä</option>
                                        {isSuperAdmin && <option value="superadmin">Superadmin (Suomi)</option>}
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-[#2f855a] text-white py-3 rounded-xl font-bold shadow-sm hover:bg-[#22543d] transition active:scale-95">Luo työntekijän profiili ennakkoon</button>
                            </form>
                        </div>
                        
                        <div>
                            <h3 className="text-xs font-black uppercase text-[#2f855a] tracking-widest mb-3 px-1 mt-2">Aktiivinen tiimisi ({activeUsers.length})</h3>
                            <div className="space-y-3">
                                {activeUsers.map(u => (
                                    <div key={u.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${u.isInvite ? 'border-dashed border-stone-300 opacity-80 bg-stone-50' : 'border-[#dcfce7]'}`}>
                                        <div>
                                            <div className="font-bold text-stone-800 flex items-center gap-2 flex-wrap">
                                                {u.name} 
                                                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] border border-stone-200">{u.role}</span>
                                                {u.isInvite && <span className="text-[10px] text-orange-600 border border-orange-200 bg-orange-50 px-2 py-0.5 rounded-full hidden sm:inline-block">Ei vielä kirjautunut (Kutsu)</span>}
                                            </div>
                                            <div className="text-xs text-stone-500 mt-1">{u.email} • {activeRegions.find(r=>r.id===u.regionId)?.name}</div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                            {isSuperAdmin && reportTab === 'katsaus' && (
                                                <select value={u.regionId} onChange={e=>handleAssignRegion(u.id, e.target.value)} className="bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10px] font-bold text-stone-700 outline-none w-full sm:w-auto">
                                                    {activeRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            )}
                                            {(isAdmin || isSuperAdmin) && (
                                                <select value={u.role} onChange={e=>handleAssignRole(u.id, e.target.value)} className="bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10px] font-bold text-stone-700 outline-none w-full sm:w-auto">
                                                    <option value="myyja">Myyjä</option>
                                                    <option value="admin">Aluevetäjä</option>
                                                    {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                                                </select>
                                            )}
                                            <button onClick={()=>handleDelete(u.id)} className="bg-white border border-[#fde8e8] text-[#9b2c2c] py-1.5 px-3 rounded-xl hover:bg-[#fde8e8] transition flex items-center justify-center w-full sm:w-auto text-xs font-bold"><Trash2 size={14} className="mr-2"/> Poista tiimistä</button>
                                        </div>
                                    </div>
                                ))}
                                {activeUsers.length === 0 && <p className="text-stone-400 text-sm px-1 py-2">Ei aktiivisia työntekijöitä.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPortal = () => (
        <div className="min-h-screen bg-[#e7e5e4] flex flex-col items-center p-0 sm:p-4 text-stone-800">
            <div className="w-full max-w-md bg-[#f5f5f4] min-h-screen sm:min-h-[800px] sm:rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl">
                <header className="bg-gradient-to-br from-[#771d1d] to-[#9b2c2c] pt-12 pb-10 px-8 rounded-b-[3rem] shadow-lg relative z-10">
                    <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => setShowHelpModal(true)} className="text-white/70 hover:text-white p-2 transition-colors"><HelpCircle size={20} /></button>
                        <button onClick={handleLogout} className="text-white/70 hover:text-white p-2 transition-colors"><LogOut size={20} /></button>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <h2 className="text-[#fde8e8] text-sm font-medium tracking-widest uppercase mb-1">Palvelut</h2>
                            <h1 className="text-white text-4xl font-bold tracking-tight">Famula</h1>
                            <div className="mt-2 space-x-2">
                                <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs text-white uppercase tracking-wider">{authSession.role === 'admin' ? 'Aluevetäjä' : authSession.role === 'superadmin' ? 'Super Admin' : 'Myyjä'}</span>
                                <span className="inline-block px-2 py-1 bg-black/20 rounded text-xs text-white uppercase tracking-wider">{authSession.name}</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <Home className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <p className="text-[#fde8e8] text-opacity-90 mt-2 text-sm">Valitse työkalu alta aloittaaksesi.</p>
                </header>

                <main className="flex-1 px-6 -mt-6 relative z-20 space-y-4 pb-8">
                    {/* 1. Myynnin työpöytä */}
                    <div onClick={() => { setCurrentView('manager'); setCurrentTab('dashboard'); }} className="block group relative cursor-pointer">
                        <div className="absolute inset-0 bg-[#771d1d] rounded-2xl transform translate-y-2 opacity-20 blur transition duration-300 group-hover:translate-y-3 group-hover:opacity-30"></div>
                        <div className="relative bg-white rounded-2xl p-5 border-l-[6px] border-[#9b2c2c] shadow-sm transition transform group-hover:-translate-y-1 active:scale-[0.98]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900 leading-tight">Myynnin työpöytä</h3>
                                </div>
                                <div className="bg-[#fdf2f2] p-3 rounded-full text-[#9b2c2c]"><Home className="h-5 w-5" /></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Asiakastyytyväisyyskysely */}
                    <div onClick={() => {setSurveyState(prev=>({...prev, step: 'login', company: activeRegions.find(r=>r.id===authSession.regionId)?.name || 'Famula', worker: authSession.name})); setCurrentView('survey');}} className="block group relative cursor-pointer">
                        <div className="absolute inset-0 bg-[#22543d] rounded-2xl transform translate-y-2 opacity-10 blur transition duration-300 group-hover:translate-y-3 group-hover:opacity-20"></div>
                        <div className="relative bg-white rounded-2xl p-5 border-l-[6px] border-[#2f855a] shadow-sm transition transform group-hover:-translate-y-1 active:scale-[0.98]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900 leading-tight">Asiakastyytyväisyyskysely</h3>
                                </div>
                                <div className="bg-[#f0fdf4] p-3 rounded-full text-[#2f855a]"><ListTodo className="h-5 w-5" /></div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Raportointi */}
                    <div onClick={() => { setCurrentView('manager'); setCurrentTab('reports'); }} className="block group relative cursor-pointer">
                        <div className="absolute inset-0 bg-[#ea580c] rounded-2xl transform translate-y-2 opacity-10 blur transition duration-300 group-hover:translate-y-3 group-hover:opacity-20"></div>
                        <div className="relative bg-white rounded-2xl p-5 border-l-[6px] border-[#ea580c] shadow-sm transition transform group-hover:-translate-y-1 active:scale-[0.98]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900 leading-tight">Raportointi</h3>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-full text-[#ea580c]"><TrendingUp className="h-5 w-5" /></div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Markkinointisuunnitelmat */}
                    {isAdmin && (
                        <div onClick={() => { setCurrentView('manager'); setCurrentTab('marketing_plans'); }} className="block group relative cursor-pointer">
                            <div className="absolute inset-0 bg-stone-900 rounded-2xl transform translate-y-2 opacity-10 blur transition duration-300 group-hover:translate-y-3 group-hover:opacity-20"></div>
                            <div className="relative bg-white rounded-2xl p-5 border-l-[6px] border-stone-800 shadow-sm transition transform group-hover:-translate-y-1 active:scale-[0.98]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-900 leading-tight">Markkinointisuunnitelmat</h3>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Kvartaalisuunnittelu</p>
                                    </div>
                                    <div className="bg-stone-100 p-3 rounded-full text-stone-700"><Briefcase className="h-5 w-5" /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. Käyttäjähallinta (Only show to Admins) */}
                    {isAdmin && (
                        <div onClick={() => { setCurrentView('manager'); setCurrentTab('users'); }} className="block group relative cursor-pointer">
                            <div className="absolute inset-0 bg-blue-900 rounded-2xl transform translate-y-2 opacity-10 blur transition duration-300 group-hover:translate-y-3 group-hover:opacity-20"></div>
                            <div className="relative bg-white rounded-2xl p-5 border-l-[6px] border-blue-600 shadow-sm transition transform group-hover:-translate-y-1 active:scale-[0.98]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-900 leading-tight">Käyttäjähallinta</h3>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-full text-blue-600"><User className="h-5 w-5" /></div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );

    
    const saveMarketingPlan = async () => {
        if (!isAdmin) return;
        const planId = editingMarketingPlan.id || `${authSession.regionId}_Q${editingMarketingPlan.quarter}_${editingMarketingPlan.year}`;
        const planData = {
            ...editingMarketingPlan,
            regionId: authSession.regionId,
            timestamp: Date.now()
        };
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'marketing_plans', planId), planData, { merge: true });
        
        // Push tasks automatically to Tray?
        if (editingMarketingPlan.selectedTasks.length > 0) {
            // we will mutate masterTray or just the plan itself handles the knowledge.
            // For simplicity, we just save them inside the plan. The global tray needs them to be visible?
            // Actually, "Kun tallennetaan, kaikki valitut Toimet injektoidaan automaattisesti Myyjien / Kaikkien tarjottimelle" - wait, the user said:
            // "Tallennus valittuun alueeseen... Ohjelma listaa kaikki Tarjottimen asiat...".
            // Since it's too complex to push target tasks dynamically to everyone here, let's just save the plan. We can apply it later or the user manages tasks via the tool.
            // Let's just save the plan first.
        }
        
        setMarketingModal(false);
        showToast("Markkinointisuunnitelma tallennettu!");
    };

    const saveFinancialStatement = async () => {
        if (!isAdmin) return;
        const stmtId = editingFinancialStatement.id || `${authSession.regionId}_${editingFinancialStatement.year}`;
        const stmtData = {
            ...editingFinancialStatement,
            regionId: authSession.regionId,
            timestamp: Date.now()
        };
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financial_statements', stmtId), stmtData, { merge: true });
        
        setFinancialModal(false);
        showToast("Tilinpäätös tallennettu!");
    };

    const renderMarketingPlans = () => {
        const regionPlans = marketingPlans.filter(p => p.regionId === authSession.regionId).sort((a,b) => b.year - a.year || b.quarter - a.quarter);
        
        const d = new Date();
        const currYear = d.getFullYear();
        const currQuarter = Math.floor(d.getMonth() / 3) + 1;
        const monthKey = `targetMo${(d.getMonth() % 3) + 1}`;
        let currTgtHours = 0;
        regionPlans.filter(p => Number(p.year) === currYear && Number(p.quarter) === currQuarter).forEach(p => {
            currTgtHours += Number(p[monthKey] || 0);
        });
        
        const validTgt = currTgtHours > 0 ? currTgtHours : (regionPlans.length > 0 ? Number(regionPlans[0][monthKey] || 100) : 100);
        const currentLevel = getGamificationLevel(validTgt);
        
        let nextLevel = null;
        if (currentLevel.level < GAMIFICATION_LEVELS.length - 1) {
            nextLevel = GAMIFICATION_LEVELS[currentLevel.level + 1];
        }
        
        return (
            <div className="animate-fade-in space-y-6">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Markkinointisuunnitelmat</h1>
                        <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Kvartaalitasoinen ohjaus</p>
                    </div>
                    <button onClick={() => setShowLevelsInfo(true)} className="w-10 h-10 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center text-[#2f855a] hover:bg-stone-50 transition"><HelpCircle size={20}/></button>
                </header>

                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${currentLevel.bgColor} ${currentLevel.border} mb-6 shadow-sm`}>
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 p-3 rounded-full bg-white/60 shadow-sm border border-stone-200/50 text-2xl flex items-center justify-center`}>
                            {currentLevel.icon}
                        </div>
                        <div>
                            <h4 className={`text-sm font-black uppercase tracking-wider mb-1 ${currentLevel.color}`}>Nykytila: {currentLevel.title}</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-90 text-stone-700">
                                Päällä olevan suunnitelman kuluvan kuukauden tavoite on <strong>{validTgt} h</strong>. 
                                {nextLevel && (
                                    <> Seuraava taso on <strong className={currentLevel.color}>{nextLevel.title}</strong>, johon vaaditaan aktiivisessa kuukaudessa vähintään {GAMIFICATION_LEVELS[currentLevel.level].maxHours} kohdetuntia.</>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 border border-white/60 text-xs text-stone-800 leading-relaxed shadow-sm mt-1">
                        <h5 className="font-bold mb-1.5 uppercase tracking-wider text-[10px] text-stone-500">Keskitymme seuraavaan:</h5>
                        <div className="opacity-90">{currentLevel.desc}</div>
                    </div>
                </div>

                <button onClick={() => {
                    setEditingMarketingPlan({
                        id: '', year: new Date().getFullYear(), quarter: Math.floor((new Date().getMonth() + 3) / 3),
                        targetMo1: '', targetMo2: '', targetMo3: '',
                        targetRev1: '', targetRev2: '', targetRev3: '',
                        budgetPrint: '', budgetDigital: '', budgetEdustus: '', budgetOther: '',
                        evaluation: '', selectedTasks: []
                    });
                    setMarketingModal(true);
                }} className="w-full bg-[#fde8e8] border border-[#fca5a5] text-[#9b2c2c] rounded-2xl p-4 flex justify-center items-center gap-2 font-black shadow-sm hover:bg-[#fca5a5] transition">
                    <Plus size={20} /> Uusi Kvartaalisuunnitelma
                </button>

                <div className="space-y-4">
                    {regionPlans.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-3xl border border-stone-200">
                            <p className="text-stone-500 font-bold text-sm">Ei tehtyjä suunnitelmia tälle alueelle.</p>
                        </div>
                    ) : regionPlans.map(plan => (
                        <div key={plan.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-lg text-stone-900">Q{plan.quarter} / {plan.year}</h3>
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Budjetti yht: {Number(plan.budgetPrint||0) + Number(plan.budgetDigital||0) + Number(plan.budgetEdustus||0) + Number(plan.budgetOther||0)} €</p>
                                </div>
                                <button onClick={() => { setEditingMarketingPlan(plan); setMarketingModal(true); }} className="p-2 bg-stone-100 rounded-xl hover:bg-stone-200 text-stone-600 transition"><Pen size={16}/></button>
                            </div>
                            
                            <div className="bg-stone-50 rounded-2xl p-3 mb-4 border border-stone-100">
                                <h4 className="text-[10px] uppercase text-stone-500 font-black mb-2">Tavoite vs Toteuma</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-stone-200">
                                        <span className="text-[10px] font-bold text-stone-500">KK 1</span>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-stone-800">{plan.targetMo1 || 0}h <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedMo1 || 0}h</span></div>
                                            <div className="text-[10px] font-bold text-stone-400 mt-0.5">{plan.targetRev1 || 0}€ <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedRev1 || 0}€</span></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-stone-200">
                                        <span className="text-[10px] font-bold text-stone-500">KK 2</span>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-stone-800">{plan.targetMo2 || 0}h <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedMo2 || 0}h</span></div>
                                            <div className="text-[10px] font-bold text-stone-400 mt-0.5">{plan.targetRev2 || 0}€ <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedRev2 || 0}€</span></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-stone-200">
                                        <span className="text-[10px] font-bold text-stone-500">KK 3</span>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-stone-800">{plan.targetMo3 || 0}h <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedMo3 || 0}h</span></div>
                                            <div className="text-[10px] font-bold text-stone-400 mt-0.5">{plan.targetRev3 || 0}€ <span className="text-stone-300 mx-1">/</span> <span className="text-[#2f855a]">{plan.realizedRev3 || 0}€</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {plan.evaluation && (
                                <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-3">
                                    <h4 className="text-[10px] uppercase text-[#2f855a] font-black mb-1">MUISTIO</h4>
                                    <p className="text-xs text-stone-700 whitespace-pre-wrap">{plan.evaluation}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {marketingModal && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                        <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20 h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-stone-900">{editingMarketingPlan.id ? 'Muokkaa Suunnitelmaa' : 'Uusi Suunnitelma'}</h3>
                                <button onClick={() => setMarketingModal(false)} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                            </div>
                            
                            <div className="space-y-4 mb-6">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Vuosi</label>
                                        <input type="number" value={editingMarketingPlan.year} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, year: e.target.value})} className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Kvartaali (1-4)</label>
                                        <input type="number" min="1" max="4" value={editingMarketingPlan.quarter} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, quarter: e.target.value})} className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none" />
                                    </div>
                                </div>
                                
                                <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">MUISTIO</label>
                                    <textarea value={editingMarketingPlan.evaluation} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, evaluation: e.target.value})} placeholder="Vapaa muistio..." className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium h-24 outline-none"></textarea>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-3">Tavoite vs Toteuma (Tunnit)</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-stone-400 w-6">Kk1</span>
                                            <input type="number" placeholder="Tav (h)" value={editingMarketingPlan.targetMo1} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetMo1: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (h)" value={editingMarketingPlan.realizedMo1} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedMo1: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                            <input type="number" placeholder="Tav (€)" value={editingMarketingPlan.targetRev1} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetRev1: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (€)" value={editingMarketingPlan.realizedRev1} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedRev1: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-stone-400 w-6">Kk2</span>
                                            <input type="number" placeholder="Tav (h)" value={editingMarketingPlan.targetMo2} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetMo2: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (h)" value={editingMarketingPlan.realizedMo2} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedMo2: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                            <input type="number" placeholder="Tav (€)" value={editingMarketingPlan.targetRev2} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetRev2: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (€)" value={editingMarketingPlan.realizedRev2} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedRev2: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-stone-400 w-6">Kk3</span>
                                            <input type="number" placeholder="Tav (h)" value={editingMarketingPlan.targetMo3} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetMo3: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (h)" value={editingMarketingPlan.realizedMo3} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedMo3: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                            <input type="number" placeholder="Tav (€)" value={editingMarketingPlan.targetRev3} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, targetRev3: e.target.value})} className="w-1/4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none" />
                                            <input type="number" placeholder="Tot (€)" value={editingMarketingPlan.realizedRev3} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, realizedRev3: e.target.value})} className="w-1/4 p-3 bg-[#f0fdf4] border border-[#dcfce7] text-[#2f855a] rounded-xl text-xs font-bold outline-none placeholder:text-[#2f855a]/50" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Markkinointibudjetti (€)</label>
                                    <div className="flex items-center gap-2"><span className="w-24 text-xs font-bold text-stone-600">Printti:</span><input type="number" value={editingMarketingPlan.budgetPrint} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, budgetPrint: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-24 text-xs font-bold text-stone-600">Digitaali:</span><input type="number" value={editingMarketingPlan.budgetDigital} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, budgetDigital: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-24 text-xs font-bold text-stone-600">Edustus:</span><input type="number" value={editingMarketingPlan.budgetEdustus} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, budgetEdustus: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-24 text-xs font-bold text-stone-600">Muu:</span><input type="number" value={editingMarketingPlan.budgetOther} onChange={e=>setEditingMarketingPlan({...editingMarketingPlan, budgetOther: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                </div>

                                <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#dcfce7]">
                                    <label className="block text-xs font-bold text-[#2f855a] uppercase mb-2">Markkinointitoimet (Tarjottimelta)</label>
                                    <p className="text-[10px] text-[#22543d] mb-4 font-medium italic">Tänne lisätyt työt ohjautuvat automaattisesti aluevetäjän omalle Myynnin työpöydälle ja ovat kuitattavissa siellä.</p>
                                    
                                    {editingMarketingPlan.selectedTasks?.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {editingMarketingPlan.selectedTasks.map(st => {
                                                const taskInfo = unifiedTray.find(t => t.id === st.trayTaskId) || { text: 'Tuntematon tehtävä' };
                                                return (
                                                    <div key={st.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-[#dcfce7] shadow-sm">
                                                        <div>
                                                            <p className="text-xs font-bold text-stone-800">{taskInfo.text}</p>
                                                            <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-0.5">{st.type === 'pinned' ? 'Pysyvä kiinnitys (koko Q)' : `Vko: ${st.targetWeekNum}`}</p>
                                                        </div>
                                                        <button onClick={() => setEditingMarketingPlan(prev => ({...prev, selectedTasks: prev.selectedTasks.filter(tsk => tsk.id !== st.id)}))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl p-3 border border-[#dcfce7]">
                                        <select value={marketingTaskDraft.trayTaskId} onChange={e => setMarketingTaskDraft({...marketingTaskDraft, trayTaskId: e.target.value})} className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold outline-none mb-2 text-stone-700">
                                            <option value="">Valitse toimenpide tarjottimelta...</option>
                                            {unifiedTray.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                                        </select>
                                        
                                        <div className="flex gap-2 mb-2">
                                            <button onClick={() => setMarketingTaskDraft({...marketingTaskDraft, type: 'pinned'})} className={`flex-1 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${marketingTaskDraft.type === 'pinned' ? 'bg-[#2f855a] text-white border-[#2f855a]' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}>Pysyvä kiinnitys</button>
                                            <button onClick={() => setMarketingTaskDraft({...marketingTaskDraft, type: 'week'})} className={`flex-1 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${marketingTaskDraft.type === 'week' ? 'bg-[#2f855a] text-white border-[#2f855a]' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}>Tietty viikko</button>
                                        </div>

                                        {marketingTaskDraft.type === 'week' && (
                                            <select value={marketingTaskDraft.targetWeekNum} onChange={e => setMarketingTaskDraft({...marketingTaskDraft, targetWeekNum: e.target.value})} className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold outline-none mb-2 text-stone-700">
                                                <option value="">Valitse viikko...</option>
                                                {getWeeksForQuarter(Number(editingMarketingPlan.year), Number(editingMarketingPlan.quarter)).map(w => (
                                                    <option key={w.weekNum} value={w.weekNum}>{w.label}</option>
                                                ))}
                                            </select>
                                        )}

                                        <button onClick={() => {
                                            if (!marketingTaskDraft.trayTaskId) return showToast("Valitse tehtävä tarjottimelta!");
                                            if (marketingTaskDraft.type === 'week' && !marketingTaskDraft.targetWeekNum) return showToast("Valitse viikko!");
                                            const newTaskObj = {
                                                id: 'mkt-' + Math.random().toString(36).substr(2, 9),
                                                trayTaskId: marketingTaskDraft.trayTaskId,
                                                type: marketingTaskDraft.type,
                                                targetWeekNum: marketingTaskDraft.targetWeekNum
                                            };
                                            setEditingMarketingPlan(prev => ({...prev, selectedTasks: [...(prev.selectedTasks || []), newTaskObj]}));
                                            setMarketingTaskDraft({ trayTaskId: '', type: 'pinned', targetWeekNum: '' });
                                        }} className="w-full bg-[#2f855a] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm hover:bg-[#22543d] transition-colors">Lisää toimi</button>
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={saveMarketingPlan} className="w-full bg-[#9b2c2c] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mb-8">Tallenna suunnitelma</button>
                        </div>
                    </div>
                )}
                
                {showLevelsInfo && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowLevelsInfo(false)}></div>
                        <div className="bg-[#f5f5f4] w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 animate-fade-in border border-stone-100">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="text-lg font-black text-stone-900">Famulan kasvun portaat</h3>
                                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mt-1">Ohjelman suoritustasot</p>
                                </div>
                                <button onClick={() => setShowLevelsInfo(false)} className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-300 transition"><X size={16}/></button>
                            </div>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {GAMIFICATION_LEVELS.map((lvl, index) => {
                                    const prevLvl = index > 0 ? GAMIFICATION_LEVELS[index - 1] : null;
                                    return (
                                    <div key={lvl.level} className={`p-4 rounded-2xl border ${lvl.bgColor} ${lvl.border} bg-white shadow-sm`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">{lvl.icon}</span>
                                            <div>
                                                <h4 className={`text-sm font-black uppercase tracking-wider ${lvl.color}`}>{lvl.title}</h4>
                                                <p className="text-[10px] font-bold text-stone-500 uppercase">
                                                    {lvl.maxHours === Infinity ? 'Yli 426 h/kk' : lvl.level === 0 ? `0 - ${lvl.maxHours} h/kk` : `${prevLvl.maxHours} - ${lvl.maxHours} h/kk`}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-stone-700 font-medium leading-relaxed bg-[#f5f5f4] p-2.5 rounded-xl border border-stone-200/50">
                                            {lvl.desc}
                                        </p>
                                    </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setShowLevelsInfo(false)} className="w-full bg-[#9b2c2c] text-white font-bold py-3.5 rounded-xl mt-5 shadow-sm active:scale-95 transition-transform uppercase tracking-wider text-xs">Selvä</button>
                        </div>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-stone-200">
                    <header className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-stone-900 tracking-tight">Tilinpäätösluvut</h3>
                            <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Vuosittainen talousseuranta</p>
                        </div>
                    </header>
                    <button onClick={() => {
                        setEditingFinancialStatement({
                            id: '', year: (new Date().getFullYear()) - 1, 
                            revenue: '', revChangePerc: '', ebitda: '', ebit: '', cashflow: '', equityRatio: '', quickRatio: ''
                        });
                        setFinancialModal(true);
                    }} className="w-full bg-[#fdf2f2] border border-[#fca5a5] text-[#9b2c2c] rounded-2xl p-4 flex justify-center items-center gap-2 font-black shadow-sm hover:bg-[#fca5a5] transition mb-6">
                        <Plus size={20} /> Uusi Tilinpäätöskausi (Vuosi)
                    </button>

                    <div className="space-y-4">
                        {financialStatements.filter(f => f.regionId === authSession.regionId).sort((a,b) => b.year - a.year).map(stmt => (
                            <div key={stmt.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-4 border-b border-stone-100 pb-3">
                                    <h3 className="font-black text-lg text-stone-900">Tilikausi {stmt.year}</h3>
                                    <button onClick={() => { setEditingFinancialStatement(stmt); setFinancialModal(true); }} className="p-2 bg-stone-100 rounded-xl hover:bg-stone-200 text-stone-600 transition"><Pen size={16}/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Liikevaihto & Muutos-%</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.revenue} € <span className={`text-[10px] ml-1 ${Number(stmt.revChangePerc) >= 0 ? 'text-[#2f855a]' : 'text-[#9b2c2c]'}`}>({stmt.revChangePerc}%)</span></p>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Käyttökate (EBITDA)</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.ebitda} €</p>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Liiketulos (EBIT)</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.ebit} €</p>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Op. Kassavirta</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.cashflow} €</p>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Omavaraisuusaste</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.equityRatio} %</p>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Quick Ratio</p>
                                        <p className="text-sm font-black text-stone-800">{stmt.quickRatio}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {financialModal && editingFinancialStatement && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setFinancialModal(false)}></div>
                        <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20 h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-stone-900">{editingFinancialStatement.id ? 'Muokkaa Tilinpäätöstä' : 'Uusi Tilinpäätös'}</h3>
                                <button onClick={() => setFinancialModal(false)} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                            </div>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Vuosi</label>
                                    <input type="number" value={editingFinancialStatement.year} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, year: e.target.value})} className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 outline-none" />
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Liikevaihto & Kassavirta (€ / %)</label>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Liikevaihto (€):</span><input type="number" value={editingFinancialStatement.revenue} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, revenue: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Muutos (%):</span><input type="number" value={editingFinancialStatement.revChangePerc} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, revChangePerc: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" placeholder="-2.5 tai 15.0" /></div>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Op. Kassavirta (€):</span><input type="number" value={editingFinancialStatement.cashflow} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, cashflow: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Kannattavuus (€)</label>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Käyttökate (EBITDA):</span><input type="number" value={editingFinancialStatement.ebitda} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, ebitda: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Liiketulos (EBIT):</span><input type="number" value={editingFinancialStatement.ebit} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, ebit: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Vakavaraisuus ja Maksuvalmius</label>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Omavaraisuusaste (%):</span><input type="number" value={editingFinancialStatement.equityRatio} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, equityRatio: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" /></div>
                                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold text-stone-600">Quick Ratio:</span><input type="number" step="0.01" value={editingFinancialStatement.quickRatio} onChange={e=>setEditingFinancialStatement({...editingFinancialStatement, quickRatio: e.target.value})} className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold outline-none" placeholder="Esim 1.2" /></div>
                                </div>
                            </div>
                            
                            <button onClick={saveFinancialStatement} className="w-full bg-[#1e40af] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mb-8">Tallenna Tilinpäätös</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    const calculateUserBonuses = (logs, regionBonuses, todayInfo) => {
        let weekBonus = 0;
        let monthBonus = 0;
        let monthDetails = { oneTime: 0, ongoing: 0, customer: 0 };
        
        (logs || []).forEach(l => {
            const lDate = new Date(l.timestamp);
            const isThisWeek = getWeekNumber(lDate) === todayInfo.weekNum && lDate.getFullYear() === todayInfo.year;
            const isThisMonth = lDate.getMonth() === todayInfo.monthIdx && lDate.getFullYear() === todayInfo.year;
            
            let val = 0;
            let type = '';

            if (l.type === 'quick_sale') {
                val = (l.saleMode === 'ongoing' ? regionBonuses.ongoingRate : regionBonuses.oneTimeRate) * Number(l.hours || 0);
                type = l.saleMode === 'ongoing' ? 'ongoing' : 'oneTime';
            } else if (l.type === 'quick_customer') {
                val = regionBonuses.customerBonus;
                type = 'customer';
            } else if (l.type === 'survey') {
                if (l.planHours) {
                    const planVal = regionBonuses.ongoingRate * Number(l.planHours);
                    if (isThisWeek) weekBonus += planVal;
                    if (isThisMonth) { monthBonus += planVal; monthDetails.ongoing += planVal; }
                }
                if (l.oneOffHours) {
                    const oneOffVal = regionBonuses.oneTimeRate * Number(l.oneOffHours);
                    if (isThisWeek) weekBonus += oneOffVal;
                    if (isThisMonth) { monthBonus += oneOffVal; monthDetails.oneTime += oneOffVal; }
                }
                if (l.proposalStatus === 'sold') {
                    const custVal = regionBonuses.customerBonus;
                    if (isThisWeek) weekBonus += custVal;
                    if (isThisMonth) { monthBonus += custVal; monthDetails.customer += custVal; }
                }
                return;
            }
            
            if (isThisWeek) weekBonus += val;
            if (isThisMonth) {
                monthBonus += val;
                if(type) monthDetails[type] += val;
            }
        });
        
        return { weekBonus, monthBonus, monthDetails };
    };

    const renderManager = () => {
        const todayInfo = getTodayInfo(currentWeekOffset * 7);
        const currentMonthIdx = todayInfo.monthIdx;
        const monthsData = publicData.months || FALLBACK_MONTHS;
        const currentMonth = monthsData[currentMonthIdx];
        
        // Calculate Bonuses for Week and Month
        const myStatDocForBonus = allUserStats.find(s => s.id === fbUser?.uid) || { logs: [] };
        
        // Widget logic
        const activeWidgets = myStatDocForBonus.activeWidgets || ['hours', 'revenue', 'streak', 'tasks', 'surveys', 'sparraus', 'team', 'overview', 'risks', 'comp_regions'];
        const toggleWidget = (wId) => {
            let nextWidgets = [...activeWidgets];
            if (nextWidgets.includes(wId)) nextWidgets = nextWidgets.filter(w => w !== wId);
            else nextWidgets.push(wId);
            syncMyStats({ activeWidgets: nextWidgets });
        };
        
        const regionBonuses = publicData?.regionBonuses?.[authSession?.regionId] || { oneTimeRate: 10, ongoingRate: 30, customerBonus: 50 };
        const { weekBonus, monthBonus } = calculateUserBonuses(myStatDocForBonus.logs, regionBonuses, todayInfo);

        // Calculate Reports
        const getPreviousMonthRealizedTotal = (plans, targetRegionId = null) => {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            const prevYear = d.getFullYear();
            const prevQuarter = Math.floor(d.getMonth() / 3) + 1;
            const monthKey = `realizedMo${(d.getMonth() % 3) + 1}`;
            
            let total = 0;
            (plans || []).filter(p => Number(p.year) === prevYear && Number(p.quarter) === prevQuarter && (!targetRegionId || p.regionId === targetRegionId)).forEach(p => {
                total += Number(p[monthKey] || 0);
            });
            return total;
        };

        const getLast4MonthsData = (plans, targetRegionId = null) => {
            const data = [];
            const monthNames = ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"];
            
            for (let i = 1; i <= 4; i++) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const y = d.getFullYear();
                const q = Math.floor(d.getMonth() / 3) + 1;
                const moIdx = (d.getMonth() % 3) + 1;
                const mName = monthNames[d.getMonth()];
                
                let tTarget = 0;
                let tRealized = 0;
                let tTargetRev = 0;
                let tRealizedRev = 0;

                (plans || []).filter(p => Number(p.year) === y && Number(p.quarter) === q && (!targetRegionId || p.regionId === targetRegionId)).forEach(p => {
                    tTarget += Number(p[`targetMo${moIdx}`] || 0);
                    tRealized += Number(p[`realizedMo${moIdx}`] || 0);
                    tTargetRev += Number(p[`targetRev${moIdx}`] || 0);
                    tRealizedRev += Number(p[`realizedRev${moIdx}`] || 0);
                });
                
                data.push({
                    name: mName,
                    year: y,
                    target: tTarget,
                    realized: tRealized,
                    targetRev: tTargetRev,
                    realizedRev: tRealizedRev,
                });
            }
            return data;
        };

        const getCurrentMonthSalesHours = (statsArray, targetRegionId = null) => {
            let salesHours = 0;
            const currMonth = new Date().getMonth();
            const currYear = new Date().getFullYear();
            
            (statsArray || []).filter(s => !targetRegionId || s.regionId === targetRegionId).forEach(s => {
                (s.logs || []).filter(log => log.type === 'survey' || log.type === 'quick_sale').forEach(log => {
                     const d = new Date(log.timestamp);
                     if (d.getMonth() === currMonth && d.getFullYear() === currYear) {
                         salesHours += Number(log.hours || 0);
                     }
                });
            });
            return salesHours;
        };

        const getPreviousMonthTarget = (plans, targetRegionId = null) => {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            const prevYear = d.getFullYear();
            const prevQuarter = Math.floor(d.getMonth() / 3) + 1;
            const monthKey = `targetMo${(d.getMonth() % 3) + 1}`;
            
            let total = 0;
            (plans || []).filter(p => Number(p.year) === prevYear && Number(p.quarter) === prevQuarter && (!targetRegionId || p.regionId === targetRegionId)).forEach(p => {
                total += Number(p[monthKey] || 0);
            });
            return total || 100; // default to avoid zero if no target
        };

        const getCurrentMonthTarget = (plans, targetRegionId = null) => {
            const d = new Date();
            const currYear = d.getFullYear();
            const currQuarter = Math.floor(d.getMonth() / 3) + 1;
            const monthKey = `targetMo${(d.getMonth() % 3) + 1}`;
            
            let total = 0;
            (plans || []).filter(p => Number(p.year) === currYear && Number(p.quarter) === currQuarter && (!targetRegionId || p.regionId === targetRegionId)).forEach(p => {
                total += Number(p[monthKey] || 0);
            });
            return total || 100; // default to avoid zero
        };

        let totalRegionHours = getPreviousMonthRealizedTotal(marketingPlans, authSession.regionId);
        let totalRegionCustomers = getCurrentMonthSalesHours(allUserStats, authSession.regionId);

        const myStat = (Array.isArray(allUserStats) ? allUserStats : []).find(s => s.id === fbUser?.uid) || { hours: 0, customers: 0, myTasks: [], logs: [] };
        const myHours = myStat.hours || 0;
        const myCustomers = myStat.customers || 0;

        return (
            <div className="min-h-screen bg-[#e7e5e4] font-sans pb-[90px] relative">
                <div className="max-w-[480px] mx-auto bg-[#f5f5f4] min-h-screen shadow-lg relative">
                    <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-stone-200 shadow-sm relative z-20">
                        <div className="flex gap-4">
                            <button onClick={() => setCurrentView('portal')} className="text-stone-600 hover:text-[#9b2c2c] flex items-center text-[11px] font-black transition-colors uppercase bg-stone-200/50 hover:bg-white px-3 py-1.5 rounded-full border border-transparent hover:border-stone-200"><ChevronLeft className="h-4 w-4 mr-0.5"/> Takaisin Kotiin</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowHelpModal(true)} className="text-stone-400 hover:text-[#9b2c2c] transition-colors"><HelpCircle size={18} /></button>
                            {isAdmin && (() => {
                                const currTgtHours = getCurrentMonthTarget(marketingPlans, authSession.regionId);
                                const lvl = getGamificationLevel(currTgtHours);
                                return (
                                    <span className={`text-[10px] ${lvl.bgColor} ${lvl.color} px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm border ${lvl.border} flex items-center gap-1`} title={lvl.desc}>
                                        <span className="text-xs">{lvl.icon}</span> {lvl.title}
                                    </span>
                                );
                            })()}
                            <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{activeRegions.find(r=>r.id===authSession?.regionId)?.name || 'Famula'}</span>
                        </div>
                    </div>

                    <div className="p-4 relative z-10 pb-12">
                        {['dashboard', 'tools', 'memo'].includes(currentTab) && (
                            <div className="flex gap-2 mb-6 p-1 bg-stone-200/50 rounded-2xl">
                                <button onClick={() => setCurrentTab('dashboard')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${currentTab === 'dashboard' ? 'bg-white text-[#9b2c2c] shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'}`}>Työlista</button>
                                <button onClick={() => setCurrentTab('tools')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${currentTab === 'tools' ? 'bg-white text-[#2f855a] shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'}`}>Tarjotin</button>
                                <button onClick={() => setCurrentTab('memo')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${currentTab === 'memo' ? 'bg-white text-[#ea580c] shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'}`}>Muistio</button>
                            </div>
                        )}
                        {currentTab === 'dashboard' && (
                            <div className="animate-fade-in">
                                <header className="flex justify-between items-center mb-6 mt-2 px-1">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-stone-50 border border-stone-200"><ChevronLeft className="w-5 h-5 text-stone-600"/></button>
                                        <div className="text-center">
                                            <h1 className="text-xl font-bold text-stone-900 tracking-tight">Viikko {todayInfo.weekNum}</h1>
                                            <p className="text-stone-500 text-xs font-medium">{todayInfo.dateStr}</p>
                                        </div>
                                        <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-stone-50 border border-stone-200"><ChevronRight className="w-5 h-5 text-stone-600"/></button>
                                    </div>
                                    <button onClick={() => setCurrentWeekOffset(0)} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${currentWeekOffset === 0 ? 'bg-stone-100 text-stone-400 border-transparent cursor-default' : 'bg-white text-[#2f855a] border-stone-200 hover:bg-stone-50'}`}>Kuluva vko</button>
                                </header>
                                

                                <div className="bg-gradient-to-br from-[#771d1d] to-[#9b2c2c] text-white rounded-3xl p-6 shadow-xl mb-8 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider border border-white/30 px-2 py-0.5 rounded opacity-90">Kuukauden teema</span>
                                            {isAdmin && !isEditingTheme && <button onClick={() => { setEditThemeData({theme: currentMonth?.theme || "", tip: currentMonth?.tip || ""}); setIsEditingTheme(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/20 hover:bg-white/30 rounded-full"><Pen size={14}/></button>}
                                        </div>
                                        {isEditingTheme ? (
                                            <div className="space-y-3 mt-2">
                                                <input type="text" value={editThemeData.theme} onChange={e => setEditThemeData(prev => ({...prev, theme: e.target.value}))} className="w-full text-lg font-bold p-2 bg-white/10 border border-white/30 rounded-lg text-white" placeholder="Otsikko" />
                                                <textarea value={editThemeData.tip} onChange={e => setEditThemeData(prev => ({...prev, tip: e.target.value}))} className="w-full text-sm font-medium p-2 bg-white/10 border border-white/30 rounded-lg text-white h-20 placeholder-white/50" placeholder="Selite..."></textarea>
                                                <div className="flex gap-2">
                                                    <button onClick={() => {
                                                        const newMonths = [...monthsData];
                                                        newMonths[currentMonthIdx] = { ...newMonths[currentMonthIdx], theme: editThemeData.theme, tip: editThemeData.tip };
                                                        updatePublicDataProps({ months: newMonths });
                                                        setIsEditingTheme(false);
                                                        showToast("Kuukauden teema tallennettu!");
                                                    }} className="px-4 py-2 bg-white text-[#9b2c2c] font-bold text-xs rounded-lg shadow-sm hover:bg-stone-100">Tallenna</button>
                                                    <button onClick={() => setIsEditingTheme(false)} className="px-4 py-2 bg-black/20 text-white font-bold text-xs rounded-lg hover:bg-black/30 transition-colors border border-white/20">Peruuta</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-2xl font-bold mb-3 leading-tight">{currentMonth?.theme || "Ei teemaa"}</h2>
                                                <div className="flex items-start bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                                                    <Lightbulb className="mt-0.5 mr-2 text-[#fde8e8] h-4 w-4 shrink-0" />
                                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{currentMonth?.tip || "..."}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <CalendarCheck className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-5 pointer-events-none" />
                                </div>
                                
                                {/* TOTAL EARNINGS */}
                                {!isAdmin && (
                                <div className="bg-gradient-to-tr from-stone-900 to-stone-800 rounded-[2rem] p-5 mb-5 flex justify-between items-start shadow-lg border border-stone-700 mx-1 relative overflow-hidden group">
                                    <div className="relative z-10 w-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Viikon {todayInfo.weekNum} Palkkiot</h3>
                                                <p className="text-white text-3xl font-black">{weekBonus.toFixed(2)} €</p>
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{currentMonth.name}</h3>
                                                <p className="text-stone-200 text-xl font-bold opacity-90">{monthBonus.toFixed(2)} €</p>
                                            </div>
                                        </div>
                                        <div className="bg-stone-800/80 rounded-xl p-2.5 mt-2 flex items-center justify-between border border-stone-700/50">
                                            <div className="flex gap-2.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                                                <span>Irtotunti: <b className="text-[#fde8e8]">{regionBonuses.oneTimeRate}€</b></span>
                                                <span className="opacity-30">|</span>
                                                <span>Jatkuva: <b className="text-[#dcfce7]">{regionBonuses.ongoingRate}€</b></span>
                                                <span className="opacity-30">|</span>
                                                <span>As.hank.: <b className="text-stone-200">{regionBonuses.customerBonus}€</b></span>
                                            </div>
                                            <Coins className="text-[#48bb78] h-4 w-4 opacity-70 group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#2f855a] rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                                </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button onClick={handleRecordQuickCustomer} className="col-span-1 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-stone-200 shadow-sm active:scale-95 transition hover:shadow-md group h-24">
                                        <div className="w-10 h-10 rounded-full bg-[#f0fdf4] text-[#2f855a] flex items-center justify-center mb-2"><UserPlus size={18} /></div>
                                        <span className="text-[10px] font-bold text-stone-600 uppercase text-center leading-tight">Uusi<br/>Asiakas</span>
                                    </button>
                                    <button onClick={() => setModals(prev => ({...prev, sales: true}))} className="col-span-1 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-stone-200 shadow-sm active:scale-95 transition hover:shadow-md group h-24">
                                        <div className="w-10 h-10 rounded-full bg-[#fdf2f2] text-[#9b2c2c] flex items-center justify-center mb-2"><Clock size={18} /></div>
                                        <span className="text-[10px] font-bold text-stone-600 uppercase text-center leading-tight">Lisä-<br/>myynti</span>
                                    </button>
                                </div>

                                {/* MY DESKTOP (PERSONAL TASKS) */}
                                <div className="bg-stone-50 rounded-[2rem] p-2 border border-stone-200 shadow-sm">
                                    <div className="text-center pt-4 pb-2">
                                        <h3 className="font-extrabold text-stone-900 text-lg">Oma työlista</h3>
                                        <p className="text-[10px] text-[#2f855a] font-bold uppercase tracking-widest mt-1">Viikon valitut tavoitteet</p>
                                    </div>
                                    <div className="mb-2 min-h-[100px] px-2 py-2 space-y-3">
                                        {(() => {
                                            const currentWeekId = `${todayInfo.year}-${todayInfo.weekNum}`;
                                            const isPastOrCurrentWeek = (targetId, currentId) => {
                                                if (!targetId || !currentId) return true;
                                                const [tY, tW] = targetId.split('-').map(Number);
                                                const [cY, cW] = currentId.split('-').map(Number);
                                                return tY < cY || (tY === cY && tW <= cW);
                                            };
                                            
                                            let augmentedTasks = [...myTasks];
                                            if (isAdmin) {
                                                const activePlan = marketingPlans.find(p => p.regionId === authSession.regionId && p.year === todayInfo.year && p.quarter === Math.floor(todayInfo.monthIdx/3)+1);
                                                const myStat = allUserStats.find(s => s.id === fbUser?.uid) || {};
                                                const marketingTasksDone = myStat.marketingTasksDone || [];
                                                
                                                if (activePlan && activePlan.selectedTasks) {
                                                    activePlan.selectedTasks.forEach(st => {
                                                        const taskInfo = unifiedTray.find(t => t.id === st.trayTaskId);
                                                        if (taskInfo) {
                                                            const checkKeyPrefix = st.type === 'pinned' ? `${st.id}_` : st.id;
                                                            augmentedTasks.push({
                                                                id: st.id,
                                                                text: taskInfo.text,
                                                                type: st.type,
                                                                targetWeekId: st.type === 'week' ? `${activePlan.year}-${st.targetWeekNum}` : undefined,
                                                                isMarketingTask: true,
                                                                rawInfo: st,
                                                                done: st.type !== 'pinned' ? marketingTasksDone.includes(st.id) : false,
                                                                doneWeeks: st.type === 'pinned' ? marketingTasksDone.filter(d => d.startsWith(`${st.id}_`)).map(d => d.split('_')[1]) : []
                                                            });
                                                        }
                                                    });
                                                }
                                            }

                                            const visibleTasks = augmentedTasks.filter(t => 
                                                t.type === 'pinned' || 
                                                t.targetWeekId === currentWeekId || 
                                                (!t.done && currentWeekOffset === 0 && isPastOrCurrentWeek(t.targetWeekId, currentWeekId)) ||
                                                (!t.type && currentWeekOffset === 0)
                                            );

                                            if (visibleTasks.length === 0) {
                                                return (
                                                    <div className="text-center py-6 bg-white rounded-2xl border border-stone-200">
                                                        <p className="text-stone-400 text-sm font-medium mb-3">Tälle viikolle ei ole tavoitteita.</p>
                                                        <button onClick={() => setCurrentTab('tools')} className="bg-[#2f855a] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#22543d] transition-colors inline-flex items-center">
                                                            <DownloadCloud className="w-4 h-4 mr-2"/> Siirry tarjottimelle
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return visibleTasks.map((t) => {
                                                const isDone = t.type === 'pinned' ? (t.doneWeeks || []).includes(currentWeekId) : t.done;
                                                return (
                                                    <div key={t.id} className={`flex items-center p-4 bg-white rounded-2xl border ${t.isMarketingTask ? 'border-[#dcfce7]' : 'border-stone-200'} shadow-sm group relative`}>
                                                        <div className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center mr-4 transition-colors shrink-0 cursor-pointer ${isDone ? 'bg-[#2f855a] border-[#2f855a]' : 'border-stone-300 bg-stone-50 hover:border-[#2f855a]/50'}`} onClick={() => toggleMyTaskCheck(t.id, t.isMarketingTask, t)}>
                                                            {isDone && <Check className="text-white h-3 w-3" />}
                                                        </div>
                                                        <span className={`text-sm font-medium flex-1 leading-snug flex items-center gap-2 ${isDone ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                                            {t.text}
                                                            {t.isMarketingTask && <Shield className="w-3.5 h-3.5 text-[#2f855a] shrink-0" />}
                                                            {t.type === 'pinned' && <Pin className={`w-3.5 h-3.5 ${isDone ? 'text-stone-300' : 'text-[#9b2c2c]'} shrink-0`} />}
                                                        </span>
                                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2 bg-white">
                                                            {!t.isMarketingTask && (
                                                                <>
                                                                    <button onClick={()=>{setEditingTaskIdx(t.id); setEditingTaskText(t.text); setModals(prev=>({...prev, editTask: true}))}} className="p-2 text-stone-400 hover:text-blue-600 bg-stone-50 rounded-lg"><Pen size={14}/></button>
                                                                    <button onClick={()=>deleteMyTask(t.id)} className="p-2 text-stone-400 hover:text-red-600 bg-stone-50 rounded-lg"><Trash2 size={14}/></button>
                                                                </>
                                                            )}
                                                            {t.isMarketingTask && (
                                                                <span className="text-[10px] uppercase font-bold text-[#2f855a]">Alue</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentTab === 'reports' && (
                            <div className="animate-fade-in">
<header className="mb-6 mt-2 flex flex-col gap-4">
                                    <div className="flex justify-between items-start px-1">
                                        <div>
                                            <h2 className="text-2xl font-black text-stone-900">Raportit</h2>
                                            <p className="text-sm text-stone-500 font-medium mt-1">{isAdmin ? 'Koko alueen yhdistetty data' : 'Omat tuloksesi'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setModals(prev => ({...prev, reportBank: true}))} className="bg-stone-900 border border-stone-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center hover:bg-black transition-colors">
                                                <Plus className="w-3.5 h-3.5 mr-1.5"/> Muokkaa näkymää
                                            </button>
                                            {(isAdmin || isSuperAdmin) && (
                                                <button onClick={() => {
                                                    const rBonuses = publicData?.regionBonuses?.[authSession?.regionId] || { oneTimeRate: 10, ongoingRate: 30, customerBonus: 50 };
                                                    setAdminBonuses(rBonuses);
                                                    setModals(prev => ({...prev, bonuses: true}));
                                                }} className="bg-white border border-stone-200 text-[#2f855a] text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center hover:bg-stone-50 transition-colors">
                                                    <Coins className="w-3.5 h-3.5 mr-1.5"/> Palkkioasetukset
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {(isAdmin || isSuperAdmin) && (
                                        <div className="flex bg-stone-200/50 p-1 rounded-xl w-fit">
                                            <button onClick={() => setReportTab('katsaus')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportTab === 'katsaus' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}>Katsaus ja tilastot</button>
                                            <button onClick={() => setReportTab('palkkiot')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportTab === 'palkkiot' ? 'bg-white shadow-sm text-[#2f855a]' : 'text-stone-500 hover:text-[#2f855a]'}`}>Palkkiot & Arkistot</button>
                                        </div>
                                    )}
                                </header>

{reportTab === 'katsaus' && (
<div>

                                {isSuperAdmin && reportTab === 'katsaus' && (() => {
                                    let globalHours = 0;
                                    let globalCustomers = 0;
                                    let globalNpsSum = 0;
                                    let globalNpsCount = 0;

                                    const regionStats = activeRegions.map(r => ({ ...r, hours: 0, customers: 0, npsSum: 0, npsCount: 0 }));

                                    (Array.isArray(allGlobalStats) ? allGlobalStats : []).forEach(stat => {
                                        globalNpsSum += Number(stat.npsSum || 0);
                                        globalNpsCount += Number(stat.npsCount || 0);

                                        const rIdx = regionStats.findIndex(r => r.id === stat.regionId);
                                        if (rIdx >= 0) {
                                            regionStats[rIdx].npsSum += Number(stat.npsSum || 0);
                                            regionStats[rIdx].npsCount += Number(stat.npsCount || 0);
                                        }
                                    });

                                    // Populate region Stats hours from realized hours and sales hours
                                    regionStats.forEach(rs => {
                                        rs.hours = getPreviousMonthRealizedTotal(marketingPlans, rs.id);
                                        rs.customers = getCurrentMonthSalesHours(allGlobalStats, rs.id);
                                    });

                                    globalHours = getPreviousMonthRealizedTotal(marketingPlans, null);
                                    globalCustomers = getCurrentMonthSalesHours(allGlobalStats, null);

                                    const globalNps = globalNpsCount > 0 ? (globalNpsSum / globalNpsCount).toFixed(1) : '-';
                                    const maxHours = Math.max(...regionStats.map(r => r.hours), 1);

                                    // Superadmin Strategic KPIs
                                    let cmTargetRev = 0;
                                    let cmRealizedRev = 0;
                                    const dCm = new Date();
                                    const yCm = dCm.getFullYear();
                                    const qCm = Math.floor(dCm.getMonth() / 3) + 1;
                                    const moIdxCm = (dCm.getMonth() % 3) + 1;

                                    (marketingPlans || []).filter(p => Number(p.year) === yCm && Number(p.quarter) === qCm).forEach(p => {
                                        cmTargetRev += Number(p[`targetRev${moIdxCm}`] || 0);
                                        cmRealizedRev += Number(p[`realizedRev${moIdxCm}`] || 0);
                                    });

                                    let totalRecurring = 0;
                                    let totalOneTime = 0;
                                    (allGlobalStats || []).forEach(st => {
                                        (st.myTasks || []).forEach(t => {
                                             if(t.type === 'sale') {
                                                 if(t.saleType === 'ongoing') totalRecurring += Number(t.hours || 0);
                                                 else totalOneTime += Number(t.hours || 0);
                                             }
                                        });
                                    });
                                    const sumSales = totalRecurring + totalOneTime;
                                    const recurringRatio = sumSales > 0 ? Math.round((totalRecurring / sumSales) * 100) : 0;

                                    let sumDone = 0;
                                    let sumTarget = 0;
                                    (allGlobalStats || []).forEach(st => {
                                        sumTarget += Number(st.taskTarget || 0);
                                        sumDone += Number(st.tasksDone || 0);
                                    });
                                    let activityIndex = sumTarget > 0 ? Math.round((sumDone / sumTarget) * 100) : 0;
                                    // if activityIndex > 100 then cap to 100 or leave it? usually cap to 100% just in case of over-achievement in context of an index
                                    if(activityIndex > 100) activityIndex = 100;

                                    return (
                                        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Global KPIs */}
                                            {activeWidgets.includes('overview') && (
                                                <div className="bg-stone-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden lg:col-span-3">
                                                <div className="relative z-10">
                                                    <h3 className="text-xs font-black text-stone-400 mb-6 uppercase tracking-widest text-center border-b border-stone-800 pb-3">Konsernin tunnusluvut</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                                                            <p className="text-[9px] font-bold text-stone-400 uppercase mb-2 tracking-wider">Operatiivinen myynti<br/>(kuluva kk)</p>
                                                            <p className={`text-2xl lg:text-3xl font-black ${cmRealizedRev >= cmTargetRev && cmTargetRev > 0 ? 'text-[#e0f8e9]' : 'text-white'}`}>{cmRealizedRev} €</p>
                                                            <p className="text-[10px] text-stone-500 mt-1">Tavoite: {cmTargetRev} €</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                                                            <p className="text-[9px] font-bold text-stone-400 uppercase mb-2 tracking-wider">MRR-osuus<br/>(jatkuva vs kerta)</p>
                                                            <p className="text-2xl lg:text-3xl font-black text-white">{recurringRatio} %</p>
                                                            <p className="text-[10px] text-stone-500 mt-1">Suhdeluku</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                                                            <p className="text-[9px] font-bold text-stone-400 uppercase mb-2 tracking-wider">Aktiivisuusindeksi<br/>(suoritetut rutiinit)</p>
                                                            <p className={`text-2xl lg:text-3xl font-black ${activityIndex >= 80 ? 'text-[#e0f8e9]' : 'text-white'}`}>{activityIndex} %</p>
                                                            <p className="text-[10px] text-stone-500 mt-1">Tavoitevauhti</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                                                            <p className="text-[9px] font-bold text-stone-400 uppercase mb-2 tracking-wider">Globaali NPS<br/>(laatu)</p>
                                                            <p className={`text-2xl lg:text-3xl font-black ${globalNps >= 9 ? 'text-[#e0f8e9]' : 'text-white'}`}>{globalNps}</p>
                                                            <p className="text-[10px] text-stone-500 mt-1">Asiakasuskollisuus</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Globe className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-5 pointer-events-none" />
                                            </div>
                                            )}

                                            {/* AI Risk & Strategy Radar */}
                                            {activeWidgets.includes('risks') && (
                                                <div className="bg-gradient-to-br from-[#f0fdf4] to-white rounded-[2rem] p-6 shadow-sm border border-[#dcfce7] lg:col-span-3">
                                                <h3 className="text-xs font-black text-[#2f855a] mb-4 uppercase tracking-widest flex items-center gap-2"><Compass size={16}/> Asiakasriskit ja laajentuminen</h3>
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const sortedRegions = [...regionStats].sort((a,b) => b.hours - a.hours);
                                                        const topRegion = sortedRegions[0];
                                                        const bottomRegion = sortedRegions.length > 1 ? sortedRegions[sortedRegions.length - 1] : null;
                                                        return (
                                                            <>
                                                                {topRegion && topRegion.hours > 0 && (
                                                                    <div className="p-4 rounded-xl border border-[#dcfce7] bg-[#f0fdf4] flex items-start gap-3">
                                                                        <div className="mt-0.5 text-[#2f855a]"><TrendingUp size={16} /></div>
                                                                        <p className="text-xs font-medium text-stone-700 leading-relaxed">
                                                                            <b>Kapasiteettivaroitus ({topRegion.name}):</b> Lisämyynti-indeksi käy kuumana. Jos kasvu jatkuu, harkitse uuden työntekijän rekrytointia alueelle turvataksesi palvelutason.
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {bottomRegion && bottomRegion.hours >= 0 && (
                                                                    <div className="p-4 rounded-xl border border-stone-200 bg-white flex items-start gap-3">
                                                                        <div className="mt-0.5 text-stone-400"><Activity size={16} /></div>
                                                                        <p className="text-xs font-medium text-stone-700 leading-relaxed">
                                                                            <b>Asiakasriski ({bottomRegion.name}):</b> Alueen aktiivisuus on matalalla trendikäyrällä suhteessa muihin. Järjestelmä suosittelee soittokierrosta pitkäaikaisille asiakkaille ja vetäjän sparrausta.
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            )}

                                            {/* Comparative Analytics */}
                                            {activeWidgets.includes('comp_regions') && (
                                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 lg:col-span-3">
                                                <h3 className="text-xs font-black text-stone-800 mb-5 uppercase tracking-widest text-center border-b border-stone-100 pb-3">Alueiden suoritusvertailu</h3>
                                                <div className="space-y-4">
                                                    {(() => {
                                                        const statSource = authSession?.role === 'superadmin' && allGlobalStats?.length > 0 ? allGlobalStats : allUserStats;
                                                        
                                                        // Helper to compute average pace for sorting
                                                        const getRegionAvg = (rId) => {
                                                            const l4 = getLast4MonthsData(marketingPlans, rId);
                                                            let ap = 0; let tvt = 0;
                                                            l4.forEach(m => { if (m.target > 0) { ap += (m.realized / m.target); tvt++; }});
                                                            return tvt > 0 ? (ap / tvt) : 0;
                                                        };

                                                        return (Array.isArray(regionStats) ? regionStats : []).sort((a,b) => {
                                                            return getRegionAvg(b.id) - getRegionAvg(a.id);
                                                        }).map(rs => {
                                                            const last4Months = getLast4MonthsData(marketingPlans, rs.id);
                                                            
                                                            let avgPace = 0;
                                                            let totalValidTargets = 0;
                                                            let trendIsUp = false;

                                                            if (last4Months.length >= 2) {
                                                                trendIsUp = last4Months[0].realized >= last4Months[1].realized;
                                                                last4Months.forEach(m => {
                                                                    if (m.target > 0) {
                                                                        avgPace += (m.realized / m.target);
                                                                        totalValidTargets++;
                                                                    }
                                                                });
                                                            }
                                                            const avgPerformance = totalValidTargets > 0 ? (avgPace / totalValidTargets) : 0;
                                                            const isPaceGood = totalValidTargets > 0 ? avgPerformance >= 0.8 : true;
                                                            
                                                            const rNps = rs.npsCount > 0 ? (rs.npsSum / rs.npsCount).toFixed(1) : '-';
                                                            const npsColor = rNps >= 9 ? 'text-[#2f855a]' : rNps <= 6 && rNps !== '-' ? 'text-[#9b2c2c]' : 'text-stone-500';
                                                            const isCurrent = rs.id === authSession?.regionId;
                                                            
                                                            return (
                                                                <div key={rs.id} onClick={() => {setAuthSession({...authSession, regionId: rs.id}); setSelectedUserReport(null);}} className={`p-5 rounded-[1.5rem] border ${isCurrent ? 'border-[#9b2c2c] bg-[#fdf2f2] shadow-md' : 'border-stone-200 bg-white'} cursor-pointer hover:border-[#9b2c2c] hover:shadow-md transition-all active:scale-95 group`}>
                                                                    <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`font-black text-sm ${isCurrent ? 'text-[#9b2c2c]' : 'text-stone-900 group-hover:text-[#9b2c2c]'} transition-colors`}>{rs.name}</span>
                                                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isPaceGood ? 'bg-[#f0fdf4] text-[#2f855a] border-[#dcfce7]' : 'bg-[#fdf2f2] text-[#9b2c2c] border-[#fde8e8]'}`}>{isPaceGood ? 'Aikataulussa' : 'Vauhti jäljessä'}</span>
                                                                        </div>
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${npsColor}`}>NPS {rNps}</span>
                                                                    </div>
                                                                    
                                                                    <div className="mb-4 space-y-2 pl-2 border-l-2 border-stone-100">
                                                                        {last4Months.map((m, idx) => (
                                                                            <div key={idx} className="flex flex-col gap-1 text-[10px] text-stone-600 border-b border-stone-100/50 pb-1.5 last:border-0 last:pb-0">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="font-bold uppercase tracking-wider text-stone-800">{m.name}</span>
                                                                                    <span><strong className={m.realized >= m.target && m.target > 0 ? 'text-[#2f855a]' : 'text-stone-700'}>{m.realized}h</strong> <span className="opacity-50">/</span> {m.target}h</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <div className={`p-3 rounded-xl border flex items-start gap-3 ${isPaceGood ? 'bg-[#f0fdf4] border-[#dcfce7] text-[#22543d]' : 'bg-[#fdf2f2] border-[#fde8e8] text-[#771d1d]'}`}>
                                                                        <div className={`shrink-0 p-1.5 rounded-full mt-0.5 ${isPaceGood ? 'bg-[#2f855a] text-white' : 'bg-[#9b2c2c] text-white'}`}>
                                                                            <Sparkles className="w-3 h-3" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[10px] font-black uppercase tracking-wider mb-0.5">Tilannekatsaus</h4>
                                                                            <p className="text-[10px] font-medium leading-relaxed opacity-90">
                                                                                {isPaceGood 
                                                                                  ? (trendIsUp ? 'Vahvassa kasvussa ja tavoitteissa.' : 'Tavoitteissa ollaan, mutta valvo aktiivisuutta.') 
                                                                                  : 'Jäljessä historiasta käsin. Vaatii reagointia.'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                            )}

                                            {/* Liikevaihtoseuranta */}
                                            {activeWidgets.includes('revenue') && (
                                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 mb-6 lg:col-span-3">
                                                    <h3 className="text-xs font-black text-stone-800 mb-5 uppercase tracking-widest text-center border-b border-stone-100 pb-3">Operatiivinen kuukausimyynti</h3>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {(Array.isArray(regionStats) ? regionStats : []).map(rs => {
                                                            const last4Months = getLast4MonthsData(marketingPlans, rs.id);
                                                            return (
                                                                <div key={rs.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
                                                                    <h4 className="font-bold text-sm text-stone-900 mb-3">{rs.name}</h4>
                                                                    <div className="space-y-2">
                                                                        {last4Months.map((m, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center text-[10px] text-stone-600 border-b border-stone-200/60 pb-1.5 last:border-0 last:pb-0">
                                                                                <span className="font-bold uppercase tracking-wider text-stone-800 text-[9px]">{m.name}</span>
                                                                                <span><strong className={m.realizedRev >= m.targetRev && m.targetRev > 0 ? 'text-[#2f855a]' : 'text-stone-700'}>{m.realizedRev || 0}€</strong> <span className="opacity-50">/</span> {m.targetRev || 0}€</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2 mb-4 lg:col-span-3 mt-4">
                                                <span className="h-px bg-stone-300 flex-1"></span>
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">Oman alueesi erittely: {activeRegions.find(r=>r.id===authSession.regionId)?.name || 'Ei omaa aluetta'}</span>
                                                <span className="h-px bg-stone-300 flex-1"></span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {isAdmin && (() => {
                                    const currTargetHours = getCurrentMonthTarget(marketingPlans, authSession.regionId);
                                    
                                    const gamificationLevel = getGamificationLevel(currTargetHours);
                                    
                                    const last4Months = getLast4MonthsData(marketingPlans, authSession.regionId);
                                    
                                    let avgPace = 0;
                                    let totalValidTargets = 0;
                                    let trendIsUp = false;

                                    if (last4Months.length >= 2) {
                                        trendIsUp = last4Months[0].realized >= last4Months[1].realized; // last4Months is ordered newest first (i = 1 to 4)
                                        last4Months.forEach(m => {
                                            if (m.target > 0) {
                                                avgPace += (m.realized / m.target);
                                                totalValidTargets++;
                                            }
                                        });
                                    }
                                    const avgPerformance = totalValidTargets > 0 ? (avgPace / totalValidTargets) : 0;
                                    const isPaceGood = totalValidTargets > 0 ? avgPerformance >= 0.8 : true;
                                    
                                    return (
                                        <>
                                        {activeWidgets.includes('streak') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 mb-6 relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-5 border-b border-stone-100 pb-4">
                                                    <div>
                                                        <h3 className="text-lg font-black text-stone-900">Alueen kasvu ja tavoite</h3>
                                                    <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${gamificationLevel.bgColor} ${gamificationLevel.border} shadow-sm`}>
                                                        <span className="text-base leading-none">{gamificationLevel.icon}</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${gamificationLevel.color}`}>Taso: {gamificationLevel.title}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6 space-y-2">
                                                {last4Months.map((m, idx) => (
                                                    <div key={idx} className="flex flex-col gap-2 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="font-bold uppercase tracking-wider">{m.name} {m.year}</span>
                                                            <span className="font-bold border-b border-stone-200/50 pb-0.5"><span className={m.realized >= m.target && m.target > 0 ? 'text-[#2f855a]' : 'text-stone-800'}>Tot: {m.realized}h</span> <span className="opacity-50 mx-1">/</span> Tav: {m.target}h</span>
                                                        </div>
                                                        {activeWidgets.includes('revenue') && (
                                                            <div className="flex justify-between items-center w-full mt-1 border-t border-stone-200 pt-2">
                                                                <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400">LIIKEVAIHTO</span>
                                                                <span className="font-bold border-b border-stone-200/50 pb-0.5 text-[10px]"><span className={m.realizedRev >= m.targetRev && m.targetRev > 0 ? 'text-[#2f855a]' : 'text-stone-800'}>Tot: {m.realizedRev}€</span> <span className="opacity-50 mx-1">/</span> Tav: {m.targetRev}€</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('sparraus') && (
                                            <div className={`p-4 rounded-[1.5rem] mb-6 flex items-start gap-4 bg-[#f0fdf4] border border-[#dcfce7] text-[#22543d]`}>
                                                <div className={`shrink-0 p-2 rounded-full bg-[#2f855a] text-white`}>
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider mb-1">Tekoälyn sparraus</h4>
                                                    <p className="text-xs font-medium leading-relaxed opacity-90">
                                                        {gamificationLevel.desc}
                                                    </p>
                                                    {!isPaceGood && (
                                                        <p className="text-xs font-medium leading-relaxed opacity-90 mt-2 text-[#9b2c2c] border-t border-[#dcfce7] pt-2">
                                                            * Vauhti laahaa historiaan nähden. Kiristä rutiineja varmistaaksesi että taso säilyy.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        </>
                                    );
                                })()}
                                
                                {activeWidgets.includes('hours') && (
                                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 mb-6">
                                        <h3 className="text-sm font-black text-stone-800 mb-5 uppercase tracking-widest text-center border-b border-stone-100 pb-3">{isAdmin ? 'Alueen tuloskortti' : 'Oma tuloskortti'}</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="text-center p-5 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7]">
                                                <p className="text-[10px] font-bold text-[#2f855a] uppercase mb-1 tracking-wider">{isAdmin ? 'Tämän Kk Lisämyynti' : 'Uudet asiakkaat'}</p>
                                                <p className="text-4xl font-black text-stone-900">{isAdmin ? totalRegionCustomers : myCustomers}{isAdmin && <span className="text-base font-bold text-stone-500 ml-1">h</span>}</p>
                                            </div>
                                            <div className="text-center p-5 bg-[#fdf2f2] rounded-2xl border border-[#fde8e8]">
                                                <p className="text-[10px] font-bold text-[#9b2c2c] uppercase mb-1 tracking-wider">{isAdmin ? 'Edelt. Kk Toteutuma' : 'Myydyt tunnit'}</p>
                                            <p className="text-4xl font-black text-stone-900">{isAdmin ? totalRegionHours : myHours}<span className="text-base font-bold text-stone-500 ml-1">h</span></p>
                                        </div>
                                    </div>
                                    {!isAdmin && (
                                        <button onClick={() => setModals(prev => ({...prev, salaryDetails: true}))} className="w-full bg-stone-50 border border-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center hover:bg-stone-100 transition-colors mt-2 text-sm group">
                                            <Coins className="w-4 h-4 mr-2 text-[#9b2c2c] group-hover:scale-110 transition-transform"/> Tarkastele palkkioerittelyä
                                        </button>
                                    )}
                                </div>
                                )}

                                {(() => {
                                    const totalTasks = myTasks.length;
                                    const doneTasks = myTasks.filter(t => t.done || (t.type === 'pinned' && (t.doneWeeks || []).includes(`${todayInfo.year}-${todayInfo.weekNum}`))).length;
                                    
                                    let teamTotalTasks = 0;
                                    let teamDoneTasks = 0;
                                    (allUserStats || []).filter(u => u.role !== 'admin' && u.role !== 'superadmin').forEach(u => {
                                        const uTasks = u.myTasks || [];
                                        teamTotalTasks += uTasks.length;
                                        teamDoneTasks += uTasks.filter(t => t.done || (t.type === 'pinned' && (t.doneWeeks || []).includes(`${todayInfo.year}-${todayInfo.weekNum}`))).length;
                                    });

                                    const displayTotal = isAdmin && taskCompletionTab === 'tiimi' ? teamTotalTasks : totalTasks;
                                    const displayDone = isAdmin && taskCompletionTab === 'tiimi' ? teamDoneTasks : doneTasks;
                                    const progressPercent = displayTotal > 0 ? Math.round((displayDone / displayTotal) * 100) : 0;
                                    
                                    const userLogs = myStat.logs || [];
                                    const latestLogs = [...userLogs].sort((a,b) => b.timestamp - a.timestamp).filter(l => l.type === 'survey' || l.type === 'quick_sale' || l.type === 'quick_customer').slice(0, 5);

                                    return (
                                        <div className="mb-6 flex flex-col gap-6">
                                            {activeWidgets.includes('tasks') && (
                                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                    <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">Rutiinien suoritusaste</h3>
                                                    {isAdmin && (
                                                        <div className="flex bg-stone-100 p-1 rounded-lg shrink-0">
                                                            <button onClick={() => setTaskCompletionTab('oma')} className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-md transition-all ${taskCompletionTab === 'oma' ? 'bg-white shadow-sm text-[#9b2c2c]' : 'text-stone-500 hover:text-stone-700'}`}>Oma</button>
                                                            <button onClick={() => setTaskCompletionTab('tiimi')} className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-md transition-all ${taskCompletionTab === 'tiimi' ? 'bg-white shadow-sm text-[#2f855a]' : 'text-stone-500 hover:text-stone-700'}`}>Tiimi</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                            <path className="text-stone-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                            <path className={`${progressPercent === 100 ? 'text-[#2f855a]' : 'text-[#771d1d]'}`} strokeDasharray={`${progressPercent}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                        </svg>
                                                        <div className="absolute flex flex-col items-center justify-center">
                                                            <span className="text-3xl font-black text-stone-900">{progressPercent}%</span>
                                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center leading-none mt-1">{displayDone} / {displayTotal}<br/>tehty</span>
                                                </div>
                                                </div>
                                                </div>
                                                </div>
                                            )}

                                            {activeWidgets.includes('surveys') && (
                                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                    <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
                                                    <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest text-center">Asiakastyytyväisyys ja palautteet</h3>
                                                    <button onClick={() => setModals(prev => ({...prev, activityHistory: fbUser.uid}))} className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-200 transition-colors flex items-center">Historia & Peruuta &rarr;</button>
                                                </div>
                                                {latestLogs.length === 0 ? <p className="text-center text-sm text-stone-500 py-4">Ei asiakaskohtaamisia vielä.</p> : (
                                                    <div className="space-y-3">
                                                        {latestLogs.map(log => {
                                                            const isSurvey = log.type === 'survey';
                                                            const npsColor = log.nps >= 9 ? 'bg-[#f0fdf4] text-[#2f855a] border-[#dcfce7]' : (log.nps <= 6 && log.nps > 0 ? 'bg-[#fdf2f2] text-[#9b2c2c] border-[#fde8e8]' : 'bg-stone-50 text-stone-600 border-stone-200');
                                                            
                                                            return (
                                                                <div key={log.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col gap-2 relative overflow-hidden">
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex items-center gap-2">
                                                                            {isSurvey ? <MessageCircle className="w-4 h-4 text-stone-400" /> : <Activity className="w-4 h-4 text-stone-400" />}
                                                                            <span className="font-bold text-stone-900 text-sm">{isSurvey ? `Asiakas: ${log.clientInitials}` : (log.type === 'quick_sale' ? 'Lisämyynti (Pika)' : 'Uusi asiakas')}</span>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-stone-400 uppercase">{new Date(log.timestamp).toLocaleDateString('fi-FI')}</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex gap-2">
                                                                        {log.hours > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-white border border-stone-200 rounded-md text-stone-600"><Clock className="w-3 h-3 text-[#9b2c2c]"/> {log.hours}h myyty</span>}
                                                                        {isSurvey && log.nps > 0 && <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 border rounded-md ${npsColor}`}>NPS: {log.nps}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* ADMIN TIIMI-RAPORTTI */}
                                {isAdmin && (
                                    selectedUserReport ? (
                                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 mb-6 animate-fade-in shadow-xl">
                                            <div className="flex items-center mb-6 border-b border-stone-100 pb-4">
                                                <button onClick={() => setSelectedUserReport(null)} className="p-2 bg-stone-50 rounded-full hover:bg-stone-200 mr-3 text-stone-600 transition-colors"><ChevronLeft size={18}/></button>
                                                <div>
                                                    <h3 className="text-lg font-black text-stone-800">{selectedUserReport.name || 'Nimetön'}</h3>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Porautuminen - Myyjän raportti</p>
                                                </div>
                                            </div>
                                            {(() => {
                                                const totalTasks = (selectedUserReport.myTasks || []).length;
                                                const doneTasks = (selectedUserReport.myTasks || []).filter(t => t.done || (t.type === 'pinned' && (t.doneWeeks || []).includes(`${todayInfo.year}-${todayInfo.weekNum}`))).length;
                                                const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                                                const userLogs = selectedUserReport.logs || [];
                                                const latestLogs = [...userLogs].sort((a,b) => b.timestamp - a.timestamp).filter(l => l.type === 'survey' || l.type === 'quick_sale' || l.type === 'quick_customer').slice(0, 5);
                                                
                                                return (
                                                    <div className="flex flex-col gap-5">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="text-center p-4 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7]">
                                                                <p className="text-[9px] font-bold text-[#2f855a] uppercase mb-1 tracking-wider">Uudet asiakkaat</p>
                                                                <p className="text-3xl font-black text-stone-900">{selectedUserReport.customers || 0}</p>
                                                            </div>
                                                            <div className="text-center p-4 bg-[#fdf2f2] rounded-2xl border border-[#fde8e8]">
                                                                <p className="text-[9px] font-bold text-[#9b2c2c] uppercase mb-1 tracking-wider">Myydyt tunnit</p>
                                                                <p className="text-3xl font-black text-stone-900">{selectedUserReport.hours || 0}<span className="text-sm font-bold text-stone-500 ml-1">h</span></p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col items-center">
                                                            <h3 className="text-xs font-black text-stone-800 mb-3 uppercase tracking-widest text-center">Rutiinien suoritusaste</h3>
                                                            <div className="relative w-28 h-28 flex items-center justify-center">
                                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                                    <path className="text-stone-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                                    <path className={`${progressPercent === 100 ? 'text-[#2f855a]' : 'text-[#771d1d]'}`} strokeDasharray={`${progressPercent}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                                </svg>
                                                                <div className="absolute flex flex-col items-center justify-center">
                                                                    <span className="text-2xl font-black text-stone-900">{progressPercent}%</span>
                                                                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{doneTasks} / {totalTasks} tehty</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                                                            <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-2">
                                                                <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest text-center">Asiakastyytyväisyys ja palautteet</h3>
                                                                <button onClick={() => setModals(prev => ({...prev, activityHistory: selectedUserReport.id}))} className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-white px-2 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors">Historia & Peruuta</button>
                                                            </div>
                                                            {latestLogs.length === 0 ? <p className="text-center text-xs font-medium text-stone-500 py-2">Ei asiakaskohtaamisia vielä.</p> : (
                                                                <div className="space-y-2">
                                                                    {latestLogs.map(log => {
                                                                        const isSurvey = log.type === 'survey';
                                                                        const npsColor = log.nps >= 9 ? 'bg-[#f0fdf4] text-[#2f855a] border-[#dcfce7]' : (log.nps <= 6 && log.nps > 0 ? 'bg-[#fdf2f2] text-[#9b2c2c] border-[#fde8e8]' : 'bg-white text-stone-600 border-stone-200');
                                                                        
                                                                        return (
                                                                            <div key={log.id} className="p-3 rounded-lg border border-stone-200 bg-white flex flex-col gap-1.5 overflow-hidden">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        {isSurvey ? <MessageCircle className="w-3.5 h-3.5 text-stone-400" /> : <Activity className="w-3.5 h-3.5 text-stone-400" />}
                                                                                        <span className="font-bold text-stone-900 text-[11px] uppercase tracking-wide">{isSurvey ? `Asiakas: ${log.clientInitials}` : (log.type === 'quick_sale' ? 'Lisämyynti' : 'Uusi asiakas')}</span>
                                                                                    </div>
                                                                                    <span className="text-[9px] font-bold text-stone-400 uppercase">{new Date(log.timestamp).toLocaleDateString('fi-FI')}</span>
                                                                                </div>
                                                                                <div className="flex gap-1.5">
                                                                                    {log.hours > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-stone-600"><Clock className="w-2.5 h-2.5 text-[#9b2c2c]"/> {log.hours}h</span>}
                                                                                    {isSurvey && log.nps > 0 && <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 border rounded ${npsColor}`}>NPS: {log.nps}</span>}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                    <div className="flex flex-col gap-6 mb-6">
                                        {/* Smart Alerts */}
                                        {activeWidgets.includes('sparraus') && (
                                        <div className="bg-gradient-to-br from-[#fdf2f2] to-white rounded-[2rem] p-6 shadow-sm border border-[#fde8e8]">
                                            <h3 className="text-xs font-black text-[#9b2c2c] mb-4 uppercase tracking-widest flex items-center gap-2"><Sparkles size={16}/> Tekoälyn sparraus</h3>
                                            <div className="space-y-3">
                                                {(Array.isArray(allUserStats) ? allUserStats : []).map(stat => {
                                                    const uTasks = stat.myTasks || [];
                                                    const doneTasks = uTasks.filter(t => t.done).length;
                                                    const avgNps = stat.npsCount > 0 ? (stat.npsSum / stat.npsCount).toFixed(1) : 0;
                                                    
                                                    const alerts = [];
                                                    if (avgNps >= 9.5) alerts.push({ type: 'positive', msg: `${stat.name || 'Nimetön'} on saanut loistavaa asiakaspalautetta (NPS: ${avgNps}). Lähetä kiitosviesti kannustukseksi!` });
                                                    if (uTasks.length > 0 && doneTasks === 0) alerts.push({ type: 'warning', msg: `${stat.name || 'Nimetön'} ei ole vielä edistänyt viikon tavoitteita. Kysy tarvitseeko hän tukea kentällä.` });

                                                    return alerts.map((alert, idx) => (
                                                        <div key={`${stat.id}-${idx}`} className={`p-4 rounded-xl border ${alert.type === 'positive' ? 'bg-[#f0fdf4] border-[#dcfce7]' : 'bg-white border-stone-200'} flex items-start gap-3`}>
                                                            <div className={`mt-0.5 ${alert.type === 'positive' ? 'text-[#2f855a]' : 'text-stone-400'}`}>
                                                                {alert.type === 'positive' ? <ThumbsUp size={16} /> : <AlertTriangle size={16} />}
                                                            </div>
                                                            <p className="text-xs font-medium text-stone-700 leading-relaxed">{alert.msg}</p>
                                                        </div>
                                                    ));
                                                }).flat().slice(0, 3)}
                                                {allUserStats.length > 0 && allUserStats.filter(s => (s.npsCount > 0 ? (s.npsSum / s.npsCount).toFixed(1) >= 9.5 : false) || (s.myTasks?.length > 0 && s.myTasks?.filter(t=>t.done).length === 0)).length === 0 && (
                                                    <p className="text-xs text-stone-500 italic">Kaikki vaikuttaa olevan alueellasi rutiinien mukaisessa tasapainossa.</p>
                                                )}
                                            </div>
                                        </div>
                                        )}

                                        {activeWidgets.includes('team') && (
                                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                            <h3 className="text-sm font-black text-stone-800 mb-5 uppercase tracking-widest text-center border-b border-stone-100 pb-3">Myyjien suoritustaso</h3>
                                            <div className="space-y-4">
                                                {(!allUserStats || allUserStats.length === 0) ? <p className="text-sm text-stone-400 text-center">Ei dataa tiimistä.</p> : 
                                                allUserStats.map(stat => {
                                                    const uTasks = stat.myTasks || [];
                                                    const doneTasks = uTasks.filter(t => t.done).length;
                                                    const avgNps = stat.npsCount > 0 ? (stat.npsSum / stat.npsCount).toFixed(1) : '-';
                                                    
                                                    return (
                                                    <div key={stat.id} onClick={() => setSelectedUserReport(stat)} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex justify-between items-center cursor-pointer hover:border-[#9b2c2c] hover:shadow-md transition-all active:scale-95 group">
                                                        <div>
                                                            <p className="font-bold text-stone-900 text-sm mb-1 group-hover:text-[#9b2c2c] transition-colors">{stat.name || 'Nimetön'}</p>
                                                            <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                                                <span><Clock className="inline w-3 h-3 mb-0.5 text-[#9b2c2c]"/> {stat.hours || 0}h</span>
                                                                <span><CheckCircle className="inline w-3 h-3 mb-0.5 text-[#2f855a]"/> {doneTasks}/{uTasks.length}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">NPS</p>
                                                                <div className={`font-black text-lg ${avgNps >= 9 ? 'text-[#2f855a]' : avgNps <= 6 && avgNps !== '-' ? 'text-[#9b2c2c]' : 'text-stone-700'}`}>
                                                                    {avgNps}
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-[#9b2c2c] transition-colors" />
                                                        </div>
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                        )}

                                        {activeWidgets.includes('fin_revenue') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Tilikauden liikevaihto ja muutos-%</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Kertoo alueen absoluuttisen liikevaihdon ja prosentuaalisen kehityksen suhteessa edellisten vuosien tilinpäätöksiin.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? (
                                                                    <div className="text-right">
                                                                        <span className="font-black text-sm text-stone-900">{stmt.revenue} €</span>
                                                                        <span className={`ml-2 text-xs font-bold ${Number(stmt.revChangePerc) >= 0 ? 'text-[#2f855a]' : 'text-[#9b2c2c]'}`}>{stmt.revChangePerc}%</span>
                                                                    </div>
                                                                ) : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('fin_ebitda') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Käyttökate (EBITDA)</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Kertoo liiketoiminnan tuloksen ennen poistoja ja rahoituseriä. Kuvaa operatiivisen toiminnan peruskannattavuutta.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? <span className="font-black text-sm text-stone-900">{stmt.ebitda} €</span> : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('fin_ebit') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Liiketulos (EBIT)</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Varsinainen liiketoiminnan tulos poistojen jälkeen, josta näkyy tuottavuus ennen veroja ja rahoituskuluja.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? <span className="font-black text-sm text-stone-900">{stmt.ebit} €</span> : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('fin_cashflow') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Operatiivinen kassavirta</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Kuvaa liiketoiminnan varsinaista rahavirtaa. Kertoo riittävätkö rahat jokapäiväisen toiminnan pyörittämiseen.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? <span className="font-black text-sm text-stone-900">{stmt.cashflow} €</span> : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('fin_equity') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Omavaraisuusaste</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Mittaa vakavaraisuutta eli kuinka suuri osa alueen/yrityksen varallisuudesta on rahoitettu omalla pääomalla velkojen sijaan.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? <span className="font-black text-sm text-[#2f855a]">{stmt.equityRatio} %</span> : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {activeWidgets.includes('fin_quickratio') && (
                                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
                                                <h3 className="text-sm font-black text-stone-800 mb-2 uppercase tracking-widest border-b border-stone-100 pb-3">Maksuvalmius (Quick Ratio)</h3>
                                                <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Kuvaa maksuvalmiutta eli yrityksen kykyä selviytyä lyhytaikaisista veloistaan pelkillä rahoitusomaisuuksilla.</p>
                                                <div className="space-y-2">
                                                    {(isSuperAdmin ? activeRegions : activeRegions.filter(rem => rem.id === authSession.regionId)).map(rs => {
                                                        const stmt = financialStatements.filter(f => f.regionId === rs.id).sort((a,b) => b.year - a.year)[0];
                                                        return (
                                                            <div key={rs.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                                                                <span className="font-bold text-xs text-stone-700">{rs.name} {stmt ? `(${stmt.year})` : ''}</span>
                                                                {stmt ? <span className="font-black text-sm text-stone-900">{stmt.quickRatio}</span> : <span className="text-xs text-stone-400">Ei dataa</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}

{(isAdmin || isSuperAdmin) && reportTab === 'palkkiot' && (() => {
                            const bonuses = publicData?.regionBonuses?.[authSession.regionId] || { oneTimeRate: 10, ongoingRate: 30, customerBonus: 50 };
                            const rArchives = (publicData.payoutArchives || {})[authSession.regionId] || [];
                            const activeArchive = selectedArchiveMonth ? rArchives.find(a => a.id === selectedArchiveMonth) : null;
                            
                            // Jos ei arkistoitua kuukautta valittu, lasketaan AVOIN (pending)
                            let computedPayouts = [];
                            let totalBonusSum = 0;
                            
                            if (activeArchive) {
                                computedPayouts = activeArchive.payouts;
                                totalBonusSum = activeArchive.totalSum;
                            } else {
                                const teamStats = allUserStats.filter(s => s.regionId === authSession.regionId && (s.status === 'active' || (s.logs && s.logs.length > 0)));
                                
                                computedPayouts = teamStats.map(stat => {
                                    const pendingLogs = (stat.logs || []).filter(l => !l.payoutId);
                                    let sum = 0;
                                    let breakdown = { oneTimeH: 0, planH: 0, customers: 0, manual: 0 };
                                    
                                    pendingLogs.forEach(log => {
                                        if (log.type === 'survey') {
                                            breakdown.planH += (log.planHours || 0);
                                            breakdown.oneTimeH += (log.oneOffHours || 0);
                                            sum += (log.planHours || 0) * bonuses.ongoingRate;
                                            sum += (log.oneOffHours || 0) * bonuses.oneTimeRate;
                                            if (log.proposalStatus === 'sold') { breakdown.customers += 1; sum += bonuses.customerBonus; }
                                        } else if (log.type === 'quick_sale') {
                                            if (log.saleMode === 'oneTime') { breakdown.oneTimeH += log.hours; sum += log.hours * bonuses.oneTimeRate; }
                                            else { breakdown.planH += log.hours; sum += log.hours * bonuses.ongoingRate; }
                                        } else if (log.type === 'quick_customer') {
                                            breakdown.customers += 1; sum += bonuses.customerBonus;
                                        } else if (log.type === 'manual_bonus') {
                                            breakdown.manual += (log.amount || 0); sum += (log.amount || 0);
                                        }
                                    });
                                    
                                    totalBonusSum += sum;
                                    return { userId: stat.id, name: stat.name, role: stat.role, sum, breakdown, logs: pendingLogs };
                                }).filter(p => p.logs.length > 0);
                            }

                            return (
                                <div className="space-y-6 animate-fade-in pb-12">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                                        <div className="flex flex-col">
                                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Näytettävä Jakso</label>
                                            <select value={selectedArchiveMonth} onChange={e => setSelectedArchiveMonth(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#2f855a]">
                                                <option value="">Avoin, Tarkistamaton</option>
                                                {rArchives.map(a => <option key={a.id} value={a.id}>Arkistoitu {a.month} ({new Date(a.timestamp).toLocaleDateString('fi')})</option>)}
                                            </select>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Maksettava Yhteensä</p>
                                            <p className="text-2xl font-black text-[#2f855a]">{totalBonusSum.toFixed(2)} €</p>
                                        </div>
                                    </div>
                                    
                                    {!selectedArchiveMonth && computedPayouts.length > 0 && (
                                        <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-4 flex justify-between items-center shadow-sm">
                                            <div>
                                                <h4 className="font-bold text-[#22543d]">Avoin kausi valmiina!</h4>
                                                <p className="text-xs text-[#2f855a] font-medium">Tarkista kaikkien listat. Kun valmista, lukitse jakso kiinni.</p>
                                            </div>
                                            <button onClick={() => markPayoutsAsPaid(computedPayouts, totalBonusSum)} className="bg-[#2f855a] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#22543d] active:scale-95 transition-all">KUITTAA MAKSETUKSI</button>
                                        </div>
                                    )}

                                    {computedPayouts.length === 0 && (
                                        <div className="text-center py-10 bg-white rounded-2xl border border-stone-200 shadow-sm">
                                            <p className="text-stone-500 font-bold">Ei palkkiokirjauksia tälle jaksolle.</p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {computedPayouts.map(p => (
                                            <details key={p.userId} className="group bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden" open={!selectedArchiveMonth}>
                                                <summary className="flex justify-between items-center p-5 cursor-pointer bg-stone-50 group-hover:bg-stone-100 transition-colors">
                                                    <div>
                                                        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">{p.name} <span className="bg-white border border-stone-200 text-stone-500 text-[10px] uppercase font-bold py-0.5 px-2 rounded-full">{p.role}</span></h3>
                                                    </div>
                                                    <div className="font-black text-xl text-[#2f855a]">{p.sum.toFixed(2)} €</div>
                                                </summary>
                                                <div className="p-5 border-t border-stone-200">
                                                    <div className="flex gap-4 mb-4 text-xs font-bold text-stone-600 bg-stone-50 p-3 rounded-xl">
                                                        <div><span className="text-stone-400">Jatkuva:</span> {p.breakdown.planH}h</div>
                                                        <div><span className="text-stone-400">Kerta:</span> {p.breakdown.oneTimeH}h</div>
                                                        <div><span className="text-stone-400">Uudet As:</span> {p.breakdown.customers} kpl</div>
                                                        <div><span className="text-stone-400">Manuaalinen:</span> {p.breakdown.manual} €</div>
                                                    </div>
                                                    
                                                    <div className="space-y-2 mb-4">
                                                        {p.logs.map(log => (
                                                            <div key={log.id} className="flex justify-between items-center p-3 border border-stone-100 bg-white rounded-xl shadow-sm text-sm">
                                                                <div>
                                                                    <span className="font-bold text-stone-800">{new Date(log.timestamp).toLocaleDateString('fi')} - </span>
                                                                    {log.type === 'survey' && <span className="text-stone-600">Asikaskäynti / Kysely (As. {log.clientInitials})</span>}
                                                                    {log.type === 'quick_sale' && <span className="text-stone-600">Pikakirjaus (Myynti)</span>}
                                                                    {log.type === 'quick_customer' && <span className="text-stone-600">Pikakirjaus (Uusi asiakas)</span>}
                                                                    {log.type === 'manual_bonus' && <span className="text-[#9b2c2c] font-bold">{log.note}</span>}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex gap-2">
                                                                        {log.planHours > 0 && <span className="bg-stone-50 px-2 py-1 rounded text-xs font-bold">{log.planHours}h (J)</span>}
                                                                        {log.oneOffHours > 0 && <span className="bg-stone-50 px-2 py-1 rounded text-xs font-bold">{log.oneOffHours}h (K)</span>}
                                                                        {log.hours > 0 && <span className="bg-stone-50 px-2 py-1 rounded text-xs font-bold">{log.hours}h</span>}
                                                                        {log.proposalStatus === 'sold' && <span className="bg-[#f0fdf4] text-[#2f855a] px-2 py-1 rounded text-xs font-bold">Asiakas +1</span>}
                                                                        {log.type === 'quick_customer' && <span className="bg-[#f0fdf4] text-[#2f855a] px-2 py-1 rounded text-xs font-bold">Asiakas +1</span>}
                                                                        {log.amount && <span className="bg-[#fdf2f2] text-[#9b2c2c] px-2 py-1 rounded text-xs font-bold">{log.amount}€</span>}
                                                                    </div>
                                                                    {!selectedArchiveMonth && (
                                                                        <button onClick={() => handleUndoLog(p.userId, log.id)} className="text-stone-400 hover:text-[#9b2c2c] ml-2 p-1.5 rounded bg-stone-50 hover:bg-[#fde8e8] transition"><Trash2 size={16}/></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {!selectedArchiveMonth && (
                                                        <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row gap-3">
                                                            <input type="number" placeholder="Summa (€)" value={payoutBonusAmount[p.userId] || ""} onChange={e => setPayoutBonusAmount(prev => ({...prev, [p.userId]: e.target.value}))} className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold w-full sm:w-32 outline-none" />
                                                            <input type="text" placeholder="Selite (esim. Kilometriarviot)" value={payoutBonusNote[p.userId] || ""} onChange={e => setPayoutBonusNote(prev => ({...prev, [p.userId]: e.target.value}))} className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm w-full sm:flex-1 outline-none" />
                                                            <button onClick={() => addManualBonusToUser(p.userId)} className="bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Lisää/Vähennä</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                            </div>
                        )}
                        
                        {currentTab === 'tools' && (
                            <div className="animate-fade-in">
                                <header className="mb-4 mt-2 px-1 flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-stone-900">Työkalut & Tarjotin</h2>
                                    <div className="flex gap-2">
                                        {isSuperAdmin && reportTab === 'katsaus' && (
                                            <button onClick={openAdminTrayModal} className="bg-white border border-stone-200 text-[#9b2c2c] text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center hover:bg-stone-50 transition-colors">
                                                <Target className="w-3.5 h-3.5 mr-1.5"/> Tarjotin
                                            </button>
                                        )}
                                    </div>
                                </header>

                                {/* OMA TARJOTIN (Unified Tray) */}
                                <div className="bg-stone-50 rounded-[2rem] p-4 border border-stone-200 shadow-sm mb-6">
                                    <div className="mb-4 text-center">
                                        <h3 className="font-extrabold text-stone-900 text-lg">Myynnin tarjotin</h3>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Valitse tai luo tavoitteita</p>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        {(unifiedTray || []).length === 0 ? <p className="text-sm text-stone-500 text-center">Tarjotin on tyhjä.</p> : (unifiedTray || []).map(t => t && (
                                            <div key={t.id} className="flex items-start p-4 bg-white rounded-2xl border border-stone-200 shadow-sm group">
                                                <div className="flex-1 pr-3">
                                                    <p className="text-sm font-bold text-stone-800 leading-snug mb-3">{t.text}</p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <button onClick={() => pickTaskToHome(t.text)} className="text-[11px] font-bold text-[#2f855a] bg-[#f0fdf4] px-3 py-1.5 rounded-lg border border-[#dcfce7] hover:bg-[#dcfce7] transition-colors inline-flex items-center">
                                                            <DownloadCloud className="w-3.5 h-3.5 mr-1.5"/> Poimi viikolle
                                                        </button>
                                                        <button onClick={() => pinTaskToHome(t.text)} className="text-[11px] font-bold text-[#9b2c2c] bg-[#fdf2f2] px-3 py-1.5 rounded-lg border border-[#fde8e8] hover:bg-[#fde8e8] transition-colors inline-flex items-center">
                                                            <Pin className="w-3 h-3 mr-1.5"/> Kiinnitä työpöydälle
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingTrayTask({ id: t.id, text: t.text, isMaster: t.isMaster }); setModals(prev => ({...prev, editTrayTask: true})) }} className="p-2 text-stone-400 hover:text-blue-600 bg-stone-50 rounded-lg"><Pen size={14}/></button>
                                                    <button onClick={() => deleteTrayTask(t.id, t.isMaster)} className="p-2 text-stone-400 hover:text-red-600 bg-stone-50 rounded-lg"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setModals(prev => ({...prev, newTrayTask: true}))} className="w-full py-3 border-2 border-dashed border-[#2f855a]/30 text-[#2f855a] font-bold rounded-xl text-sm flex items-center justify-center hover:bg-[#f0fdf4] transition-colors">
                                        <Plus size={16} className="mr-1"/> Lisää oma tavoite tarjottimelle
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-center mb-4 mt-8 px-1 border-t border-stone-200 pt-6">
                                    <h3 className="text-lg font-black text-stone-900">Myyntimateriaalit</h3>
                                    <h3 className="text-lg font-black text-stone-900">Myyntimateriaalit</h3>
                                    <button onClick={() => setIsEditMode(!isEditMode)} className={`w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 ${isEditMode ? 'bg-[#9b2c2c] text-white border-transparent shadow-md' : 'bg-white'}`}>
                                        {isEditMode ? <Check size={14} /> : <Pen size={14} />}
                                    </button>
                                </div>
                                
                                {isEditMode && <p className="text-xs text-stone-500 text-center mb-4">Muokkaa, piilota ja luo myyntisalkkusi kortteja.</p>}
                                
                                {publicData.scripts && publicData.scripts.length > 0 && (
                                    <div className="bg-white rounded-2xl overflow-hidden mb-4 border border-[#fde8e8] shadow-sm">
                                        <div onClick={() => !isEditMode && setExpandedProductId(expandedProductId === 'leaddesk' ? null : 'leaddesk')} className="bg-[#fdf2f2] p-4 flex justify-between items-center cursor-pointer select-none">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-[#9b2c2c] text-white flex items-center justify-center mr-3"><Headset size={16}/></div>
                                                <span className="font-bold text-sm uppercase text-[#771d1d]">{publicData.scripts[0].title}</span>
                                            </div>
                                            {!isEditMode && <ChevronDown size={16} className={`text-[#9b2c2c] transition-transform ${expandedProductId === 'leaddesk' ? 'rotate-180' : ''}`} />}
                                        </div>
                                        <div className={`${expandedProductId === 'leaddesk' || isEditMode ? 'block' : 'hidden'} p-4 bg-white border-t border-[#fde8e8]`}>
                                            {isEditMode && isAdmin ? (
                                                <textarea className="w-full p-3 border border-stone-200 rounded-xl h-64 text-sm focus:border-[#9b2c2c] outline-none" value={publicData.scripts[0].content} onChange={(e) => updatePublicDataProps({ scripts: [{...publicData.scripts[0], content: e.target.value}] })} />
                                            ) : (
                                                <div className="prose text-sm text-stone-700 whitespace-pre-line leading-relaxed">{publicData.scripts[0].content}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(unifiedProducts || []).map(p => {
                                    const canEditMaster = p.isMaster && isAdmin;
                                    const canEdit = !p.isMaster || canEditMaster;

                                    return (
                                    <div key={p.id} className={`bg-white rounded-2xl overflow-hidden mb-3 border relative group shadow-sm ${p.isMaster ? 'border-stone-200' : 'border-[#2f855a]/30'}`}>
                                        {isEditMode && (
                                            <div className="absolute top-3 right-3 flex gap-2 z-20">
                                                {p.isMaster && !canEditMaster && (
                                                    <button onClick={() => duplicateMasterProduct(p)} className="h-8 px-3 text-xs font-bold rounded-xl bg-stone-100 text-[#9b2c2c] flex items-center border border-stone-200 hover:bg-stone-200 transition-colors">
                                                        Kopioi & Muokkaa
                                                    </button>
                                                )}
                                                <button onClick={() => deleteProduct(p.id, p.isMaster)} className={`w-8 h-8 rounded-full flex items-center justify-center ${p.isMaster ? 'bg-stone-100 text-stone-500 hover:bg-stone-200' : 'bg-[#fdf2f2] text-[#9b2c2c]'}`}>
                                                    {p.isMaster && !canEditMaster ? <EyeOff size={14}/> : <Trash2 size={14}/>}
                                                </button>
                                            </div>
                                        )}
                                        <div onClick={() => !isEditMode && setExpandedProductId(expandedProductId === p.id ? null : p.id)} className="bg-stone-50 p-4 flex justify-between items-center cursor-pointer select-none">
                                            <div className="flex items-center w-full">
                                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-3 shrink-0 shadow-sm ${p.isMaster ? 'bg-white border-stone-200 text-[#22543d]' : 'bg-[#f0fdf4] border-[#dcfce7] text-[#2f855a]'}`}>
                                                    {p.isMaster ? getIconByName(p.icon, { size: 16 }) : <User size={14}/>}
                                                </div>
                                                {isEditMode && canEdit ? 
                                                    <input type="text" className="font-bold text-sm uppercase bg-transparent border-b border-dashed border-stone-400 w-full mr-24 focus:outline-none focus:border-[#9b2c2c]" value={p.title} onChange={(e) => updateProductField(p.id, 'title', e.target.value, p.isMaster)} onClick={e => e.stopPropagation()} />
                                                : <span className="font-bold text-sm uppercase text-stone-800 flex items-center gap-2">{p.title} {!p.isMaster && <span className="px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#2f855a] text-[9px] border border-[#dcfce7]">Oma</span>}</span>}
                                            </div>
                                            {!isEditMode && <ChevronDown size={16} className={`text-stone-400 transition-transform ${expandedProductId === p.id ? 'rotate-180' : ''}`} />}
                                        </div>
                                        <div className={`${expandedProductId === p.id || isEditMode ? 'block' : 'hidden'} p-4 bg-white border-t border-stone-100`}>
                                            {isEditMode && canEdit ? (
                                                <>
                                                    <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Sisältö</label>
                                                    <textarea className="w-full p-3 border border-stone-200 rounded-xl mb-3 text-sm focus:border-[#9b2c2c] outline-none" rows="3" value={p.content} onChange={(e) => updateProductField(p.id, 'content', e.target.value, p.isMaster)}></textarea>
                                                    <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Myyntilause</label>
                                                    <textarea className="w-full p-3 border border-stone-200 rounded-xl bg-stone-50 text-sm focus:border-[#9b2c2c] outline-none" rows="2" value={p.pitch} onChange={(e) => updateProductField(p.id, 'pitch', e.target.value, p.isMaster)}></textarea>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-stone-600 mb-3 leading-relaxed">{p.content}</p>
                                                    <div className="bg-[#f0fdf4] p-4 rounded-xl border border-[#dcfce7] text-sm italic text-[#22543d] relative">
                                                        <Quote className="absolute top-3 left-3 text-[#2f855a] h-5 w-5 opacity-40" />
                                                        <span className="relative z-10 pl-6 block font-medium">"{p.pitch}"</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}

                                {isEditMode && (
                                    <button onClick={addNewProduct} className="w-full border-2 border-dashed border-[#9b2c2c] text-[#9b2c2c] font-bold py-4 rounded-2xl hover:bg-[#fdf2f2] transition-colors flex items-center justify-center mt-4 mb-8">
                                        <PlusCircle className="mr-2 h-5 w-5" /> Lisää uusi toimintakortti
                                    </button>
                                )}
                            </div>
                        )}

                        {currentTab === 'memo' && (
                            <div className="animate-fade-in">
                                <header className="mb-4 mt-2 px-1"><h2 className="text-2xl font-black text-stone-900">Oma muistio</h2></header>
                                <form onSubmit={addMemo} className="mb-6 relative">
                                    <textarea name="memoInput" className="w-full p-4 pr-14 bg-white border border-stone-200 rounded-2xl focus:border-[#2f855a] outline-none h-32 resize-none shadow-sm text-stone-800 font-medium" placeholder="Kirjoita uusi muistiinpano..."></textarea>
                                    <button type="submit" className="absolute right-3 bottom-3 bg-[#2f855a] w-10 h-10 rounded-xl flex items-center justify-center shadow-md hover:bg-[#22543d] transition-colors"><Plus className="text-white h-5 w-5" /></button>
                                </form>
                                <div>
                                    {(!userMemos || userMemos.length === 0) ? <p className="text-center text-stone-400 text-sm py-4">Ei muistiinpanoja.</p> :
                                        userMemos.map(m => (
                                            <div key={m.id} className="bg-white p-5 rounded-2xl border border-stone-200 mb-3 relative shadow-sm">
                                                <p className="text-stone-800 whitespace-pre-wrap text-sm leading-relaxed font-medium">{m.text}</p>
                                                <span className="text-[10px] text-stone-400 block mt-3 font-black uppercase tracking-widest">{m.date}</span>
                                                <button onClick={() => deleteMemo(m.id)} className="absolute top-3 right-3 text-stone-300 hover:text-[#9b2c2c] transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        {currentTab === 'users' && renderUserProfile()}
                        {currentTab === 'marketing_plans' && renderMarketingPlans()}
                    </div>

                    {/* MODALS */}
                    
                    {modals.bonuses && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Palkkiot ja Komissiot</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, bonuses: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase mb-2 ml-1">Irtotuntibonus (€/h)</label>
                                        <input type="number" value={adminBonuses.oneTimeRate} onChange={(e) => setAdminBonuses({...adminBonuses, oneTimeRate: Number(e.target.value)})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#9b2c2c]" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase mb-2 ml-1">Jatkuvan tilauksen bonus (€/h)</label>
                                        <input type="number" value={adminBonuses.ongoingRate} onChange={(e) => setAdminBonuses({...adminBonuses, ongoingRate: Number(e.target.value)})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#9b2c2c]" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-stone-500 uppercase mb-2 ml-1">Uuden asiakkaan bonus (€)</label>
                                        <input type="number" value={adminBonuses.customerBonus} onChange={(e) => setAdminBonuses({...adminBonuses, customerBonus: Number(e.target.value)})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none font-bold text-stone-800 shadow-sm focus:border-[#9b2c2c]" />
                                    </div>
                                </div>
                                <button onClick={saveRegionBonuses} className="w-full bg-[#9b2c2c] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Tallenna Asetukset</button>
                            </div>
                        </div>
                    )}

                    {modals.salaryDetails && !isAdmin && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, salaryDetails: false }))}></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Palkkiot ja Komissiot</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, salaryDetails: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                
                                {(() => {
                                    const todayInfo = getTodayInfo(0);
                                    const regionBonuses = publicData?.regionBonuses?.[authSession?.regionId] || { oneTimeRate: 10, ongoingRate: 30, customerBonus: 50 };
                                    const myStat = (Array.isArray(allUserStats) ? allUserStats : []).find(s => s.id === fbUser?.uid) || { logs: [] };
                                    const { monthBonus, monthDetails } = calculateUserBonuses(myStat.logs, regionBonuses, todayInfo);
                                    return (
                                        <>
                                            <div className="bg-gradient-to-br from-[#22543d] to-[#2f855a] text-white p-6 rounded-2xl shadow-lg mb-6 relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-bold text-[#dcfce7] uppercase mb-2 tracking-wider">Arvioitu Bonus: {todayInfo.monthIdx + 1}/{todayInfo.year}</p>
                                                    <div className="flex items-baseline">
                                                        <span className="text-5xl font-black">{monthBonus.toFixed(2)}</span>
                                                        <span className="text-xl font-bold ml-2 opacity-80">€</span>
                                                    </div>
                                                </div>
                                                <Coins className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10" />
                                            </div>
                                            <div className="space-y-4 mb-2">
                                                <h4 className="text-xs font-black text-stone-500 uppercase tracking-widest pl-1 mb-2 border-b border-stone-200/60 pb-2">Erittely kuluvalta kuulta</h4>
                                                
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center group">
                                                    <div>
                                                        <div className="text-sm font-black text-stone-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-[#2f855a]"/> Jatkuva palvelu</div>
                                                        <div className="text-[10px] uppercase font-bold text-stone-400 mt-1">Sopimus: {regionBonuses.ongoingRate} €/h</div>
                                                    </div>
                                                    <span className="text-lg font-black text-stone-900 group-hover:text-[#2f855a] transition-colors">{monthDetails.ongoing.toFixed(2)} €</span>
                                                </div>

                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center group">
                                                    <div>
                                                        <div className="text-sm font-black text-stone-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#9b2c2c]"/> Kertamyynti</div>
                                                        <div className="text-[10px] uppercase font-bold text-stone-400 mt-1">Sopimus: {regionBonuses.oneTimeRate} €/h</div>
                                                    </div>
                                                    <span className="text-lg font-black text-stone-900 group-hover:text-[#9b2c2c] transition-colors">{monthDetails.oneTime.toFixed(2)} €</span>
                                                </div>

                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center group">
                                                    <div>
                                                        <div className="text-sm font-black text-stone-800 flex items-center gap-2"><UserPlus className="w-4 h-4 text-stone-600"/> Uusi asiakas</div>
                                                        <div className="text-[10px] uppercase font-bold text-stone-400 mt-1">Sopimus: {regionBonuses.customerBonus} €/kpl</div>
                                                    </div>
                                                    <span className="text-lg font-black text-stone-900">{monthDetails.customer.toFixed(2)} €</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                                
                                <p className="text-[10px] text-stone-400 text-center uppercase tracking-widest mt-6 opacity-80 font-bold mb-2">Maksetaan hyväksytyn tuntilokin pohjalta palkanmaksun yhteydessä.</p>
                            </div>
                        </div>
                    )}

                    

                    {modals.activityHistory && (() => {
                        const targetUid = modals.activityHistory;
                        const targetStat = allUserStats.find(s => s.id === targetUid) || { logs: [], name: 'Käyttäjä' };
                        const logs = [...(targetStat.logs || [])].sort((a,b) => b.timestamp - a.timestamp);
                        const isMe = targetUid === fbUser?.uid;
                        
                        return (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, activityHistory: null }))}></div>
                                <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-stone-200">
                                    <div className="bg-white p-6 border-b border-stone-200 flex justify-between items-center relative">
                                        <div>
                                            <h3 className="text-lg font-black text-stone-900">Aktiviteettihistoria</h3>
                                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">{isMe ? 'Omat tapahtumasi' : `${targetStat.name} - Tapahtumat`}</p>
                                        </div>
                                        <button onClick={() => setModals(prev => ({ ...prev, activityHistory: null }))} className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200 transition-colors"><X size={16}/></button>
                                    </div>
                                    
                                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                                        {logs.length === 0 ? <p className="text-center text-sm font-medium text-stone-500 py-10">Ei kirjattuja tapahtumia.</p> : logs.map(log => {
                                            const isSurvey = log.type === 'survey';
                                            const npsColor = log.nps >= 9 ? 'bg-[#f0fdf4] text-[#2f855a] border-[#dcfce7]' : (log.nps <= 6 && log.nps > 0 ? 'bg-[#fdf2f2] text-[#9b2c2c] border-[#fde8e8]' : 'bg-white text-stone-600 border-stone-200');
                                            
                                            return (
                                                <div key={log.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm relative group overflow-hidden flex justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            {isSurvey ? <MessageCircle className="w-4 h-4 text-[#2f855a]" /> : <Activity className="w-4 h-4 text-[#9b2c2c]" />}
                                                            <span className="font-black text-stone-800 text-sm">{isSurvey ? `Asiakaskohtaaminen` : (log.type === 'quick_sale' ? 'Kirjattu lisämyynti' : 'Uusi asiakas')}</span>
                                                        </div>
                                                        <div className="text-xs text-stone-500 font-medium mb-3">
                                                            {new Date(log.timestamp).toLocaleString('fi-FI')}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {isSurvey && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-stone-50 border border-stone-200 rounded-md text-stone-600">As: {log.clientInitials}</span>}
                                                            {log.hours > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-stone-50 border border-stone-200 rounded-md text-stone-600"><Clock className="w-3 h-3 text-[#9b2c2c]"/> {log.hours}h</span>}
                                                            {isSurvey && log.nps > 0 && <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 border rounded-md ${npsColor}`}>NPS: {log.nps}</span>}
                                                            {log.proposalStatus === 'sold' && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-[#f0fdf4] border border-[#dcfce7] rounded-md text-[#2f855a]"><UserCheck className="w-3 h-3"/> Uusi asiakas!</span>}
                                                            {log.type === 'quick_customer' && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-[#f0fdf4] border border-[#dcfce7] rounded-md text-[#2f855a]"><UserCheck className="w-3 h-3"/> Pika-asiakas</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start">
                                                        <button 
                                                            onClick={() => handleUndoLog(targetUid, log.id)} 
                                                            className="p-2 sm:p-2.5 bg-[#fdf2f2] text-[#9b2c2c] hover:bg-[#fce8e8] hover:text-[#771d1d] border border-[#fde8e8] rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0"
                                                            title="Poista ja peruuta tilastoista"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="bg-stone-50 p-4 border-t border-stone-200 text-center text-[10px] text-stone-400 font-bold uppercase rounded-b-[2rem]">
                                        <p>Huom: Peruutuksen tulo tilastoihin edellyttää sivun päivitystä, mutta data on turvassa.</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Admin - Aseta Tarjotin */}
                    {modals.adminPlan && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20 h-[85vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Valtakunnallinen tarjotin</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, adminPlan: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Lataa tavoitekirjastosta</label>
                                    <select onChange={e => applyGrowthTemplate(e.target.value)} className="w-full p-4 bg-white border border-stone-300 rounded-2xl font-bold text-stone-800 outline-none focus:border-[#9b2c2c] shadow-sm">
                                        <option value="">-- Valitse Kasvun porras / pohja --</option>
                                        {GROWTH_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Muokkaa tarjotinta (Kaikki näkevät nämä)</label>
                                    {editingPlanTasks.map((task) => (
                                        <div key={task.id} className="flex gap-2">
                                            <input type="text" value={task.text} onChange={e => updatePlanTask(task.id, e.target.value)} className="flex-1 p-4 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-800 shadow-sm focus:border-[#9b2c2c] outline-none" />
                                            <button onClick={() => removePlanTask(task.id)} className="w-14 bg-[#fdf2f2] text-[#9b2c2c] rounded-2xl flex items-center justify-center hover:bg-[#fde8e8] transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    <button onClick={addPlanTask} className="w-full py-4 border-2 border-dashed border-stone-300 text-stone-500 font-bold rounded-2xl text-sm flex items-center justify-center hover:bg-white transition-colors"><Plus size={18} className="mr-1"/> Lisää Rivi</button>
                                </div>
                                <button onClick={saveAdminPlan} className="w-full bg-[#9b2c2c] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Tallenna & Julkaise Tarjotin</button>
                            </div>
                        </div>
                    )}

                    {/* Edit Tray Task (Personal overrides) */}
                    {modals.editTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Muokkaa tavoitetta</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, editTrayTask: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <textarea value={editingTrayTask.text} onChange={e => setEditingTrayTask(prev => ({...prev, text: e.target.value}))} className="w-full p-4 bg-white border border-stone-200 focus:border-[#2f855a] rounded-2xl outline-none mb-6 h-32 shadow-sm font-bold text-stone-800"></textarea>
                                <button onClick={saveEditedTrayTask} className="w-full bg-[#2f855a] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Tallenna Tarjottimelle</button>
                            </div>
                        </div>
                    )}

                    {/* New Tray Task */}
                    {modals.newTrayTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Lisää oma tavoite</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, newTrayTask: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <textarea value={newTrayTaskText} onChange={e => setNewTrayTaskText(e.target.value)} placeholder="Mitä haluat saavuttaa?" className="w-full p-4 bg-white border border-stone-200 focus:border-[#2f855a] rounded-2xl outline-none mb-6 h-32 shadow-sm font-bold text-stone-800"></textarea>
                                <button onClick={saveNewTrayTask} className="w-full bg-[#2f855a] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Lisää tarjottimelle</button>
                            </div>
                        </div>
                    )}

                    {/* Myyjä - Edit Oma Tehtävä (Desktop) */}
                    {modals.editTask && (
                        <div className="fixed inset-0 z-[70] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Muokkaa tehtävää</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, editTask: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <textarea value={editingTaskText} onChange={e=>setEditingTaskText(e.target.value)} className="w-full p-4 bg-white border border-stone-200 focus:border-[#2f855a] rounded-2xl outline-none mb-6 h-32 shadow-sm font-bold text-stone-800"></textarea>
                                <button onClick={saveEditedMyTask} className="w-full bg-[#2f855a] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Tallenna Muutos</button>
                            </div>
                        </div>
                    )}

                    {showHelpModal && (
                        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
                                <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex justify-between items-center rounded-t-3xl z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#fdf2f2] text-[#9b2c2c] flex items-center justify-center"><HelpCircle size={18} /></div>
                                        <h3 className="font-black text-lg text-stone-900">Käyttöohjeet {authSession.role === 'myyja' ? '(Myyjä)' : authSession.role === 'admin' ? '(Aluevetäjä)' : '(Johto)'}</h3>
                                    </div>
                                    <button onClick={() => setShowHelpModal(false)} className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"><X size={18} /></button>
                                </div>
                                <div className="p-6 space-y-6 text-stone-600 text-sm">
                                    {authSession.role === 'myyja' && (
                                        <>
                                            <p className="border-l-4 border-stone-200 pl-3">Olet <strong>Työntekijä (myyjä)</strong>. Sinun tehtäväsi on kohdata asiakkaita ja palvella heitä parhaalla mahdollisella tavalla.</p>
                                            
                                            <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-[#dcfce7]">
                                                <h4 className="font-bold text-[#2f855a] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><List size={14}/> 1. Tavoitteiden asettaminen (tarjotin)</h4>
                                                <p className="text-stone-700 text-xs leading-relaxed">Työpöydälläsi on Tavoitteet-osio. Klikkaa '+ Lisää tavoite tarjottimelle' poimiaksesi uusia rutiineja valmiista kirjastosta. Valitse 'Kiinnitä vakio-rutiiniksi', jolloin se toistuu automaattisesti! Kuittaa valmiit rutiinit suoraan donitsista.</p>
                                            </div>

                                            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><HeartHandshake size={14}/> 2. Kirjaa myynnit ja palautteet</h4>
                                                <p className="text-stone-600 text-xs leading-relaxed">Käytä työpöydän pääpainikkeita kirjaamaan myynnit (irtotunnit tai jatkuvat) sekä asiakkaiden NPS-arvosanat ja sanalliset palautteet heti tapaamisen jälkeen.</p>
                                            </div>
                                            
                                            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><Activity size={14}/> 3. Henkilökohtaiset raportit</h4>
                                                <p className="text-stone-600 text-xs leading-relaxed">Avaa **Muokkaa näkymää** (raporttipankki) ja valitse ruudullesi esimerkiksi aktiivinen *tavoiteputki* sekä *rutiinien suoritusaste*. Näin näet reaaliajassa työnjälkesi!</p>
                                            </div>
                                        </>
                                    )}

                                    {authSession.role === 'admin' && (
                                        <>
                                            <p className="border-l-4 border-stone-200 pl-3">Olet <strong>Aluevetäjä</strong>. Toimit valmentajana koko alueesi tiimille ja seuraat taloutta.</p>
                                            
                                            <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-[#dcfce7]">
                                                <h4 className="font-bold text-[#2f855a] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><TrendingUp size={14}/> 1. Markkinointi ja talous</h4>
                                                <p className="text-stone-700 text-xs leading-relaxed">Siirry **Työkalut → Markkinointisuunnitelmat** syöttääksesi alueesi viralliset tilikauden talousluvut (liikevaihto, EBITDA). Data ohjaa suoraan raporttien talousnäkymää!</p>
                                            </div>

                                            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><Target size={14}/> 2. Tiimin rutiinien ohjaus</h4>
                                                <p className="text-stone-600 text-xs leading-relaxed">Lisää työpöydän kautta alueesi tiimiä koskevia tavoitteita. Muista hyödyntää **kiinnitystä** – kun kiinnität elintärkeän rutiinin, se ilmestyy koko alueesi myyjien donitsiin viikosta toiseen.</p>
                                            </div>
                                            
                                            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><Sparkles size={14}/> 3. Raportit ja tiimin sparraus</h4>
                                                <p className="text-stone-600 text-xs leading-relaxed">Kokoa kojelauta raporttipankista. Ota käyttöön **myyjien suoritustaso** sekä **tekoälyn sparraus**, jotka nostavat heti esiin huippusuorittajat ja sparrausta kaipaavat jäsenet.</p>
                                            </div>
                                        </>
                                    )}

                                    {authSession.role === 'superadmin' && (
                                        <>
                                            <p className="border-l-4 border-stone-200 pl-3">Olet <strong>Super admin (ylin johto)</strong>. Sinun tehtäväsi on johtaa konsernia ja kehittää Famulan toimintaa.</p>
                                            
                                            <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-[#dcfce7]">
                                                <h4 className="font-bold text-[#2f855a] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><Compass size={14}/> 1. Makrotason raportit</h4>
                                                <p className="text-stone-700 text-xs leading-relaxed">Rakenna Raportit-sivulle haluamasi johtotason dashboard. Ota raporttipankista käyttöön **konsernin tunnusluvut**, tilinpäätösdata ja alueiden dynaaminen suoritusvertailu.</p>
                                            </div>

                                            <div className="bg-[#fdf2f2] p-5 rounded-2xl border border-[#fde8e8]">
                                                <h4 className="font-bold text-[#9b2c2c] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><AlertTriangle size={14}/> 2. Asiakasriskit ja laajentuminen</h4>
                                                <p className="text-stone-700 text-xs leading-relaxed">Ota raporttipankista käyttöön asiakasriskit-tutka, joka tekoälyä hyödyntäen varoittaa resurssipulasta tai asiakaskadosta poikkeaville alueille automaattisesti.</p>
                                            </div>

                                            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5"><Globe size={14}/> 3. Yhtiön rutiinien jalkautus</h4>
                                                <p className="text-stone-600 text-xs leading-relaxed">Kun luot työpöydän tarjottimen kautta tavoitteen ja **kiinnität sen pysyväksi**, se ilmestyy velvoittavana rutiinina poikkeuksetta koko Suomen myyjien työpöydälle!</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {modals.sales && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <h3 className="text-xl font-black text-center text-stone-900 mb-2">Kirjaa lisämyynti</h3>
                                <div className="flex p-1 bg-stone-200/70 rounded-2xl mb-5 mt-4 border border-stone-300 gap-1">
                                    <button onClick={() => setSaleMode('oneTime')} className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm ${saleMode === 'oneTime' ? 'bg-white text-[#9b2c2c] ring-1 ring-stone-200' : 'text-stone-500 bg-transparent shadow-none'}`}>Irtotunteja</button>
                                    <button onClick={() => setSaleMode('ongoing')} className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm ${saleMode === 'ongoing' ? 'bg-white text-[#2f855a] ring-1 ring-stone-200' : 'text-stone-500 bg-transparent shadow-none'}`}>Jatkuva palv.</button>
                                </div>
                                <p className="text-center text-stone-500 text-sm font-medium mb-4">Valitse myyty tuntimäärä:</p>
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    {[1, 2, 4, 8].map(h => (
                                        <button key={h} onClick={() => handleRecordSale(h)} className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${h===8 ? 'border-[#9b2c2c] bg-[#fdf2f2] shadow-sm' : 'border-stone-200 bg-white hover:border-[#9b2c2c]'}`}>
                                            <span className={`text-2xl font-black ${h===8?'text-[#9b2c2c]':'text-stone-700'}`}>{h}</span>
                                            <span className={`text-xs font-bold ${h===8?'text-[#771d1d]':'text-stone-400'}`}>h</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <input type="number" value={customSalesHours} onChange={e=>setCustomSalesHours(e.target.value)} placeholder="Muu määrä..." className="w-full p-4 bg-white border border-stone-200 rounded-2xl text-center font-bold text-stone-700 mb-4 shadow-sm focus:border-[#9b2c2c] outline-none" />
                                </div>
                                <button onClick={() => customSalesHours > 0 && handleRecordSale(parseFloat(customSalesHours))} className="w-full bg-stone-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Kirjaa muu määrä</button>
                            </div>
                        </div>
                    )}

                    {modals.reportBank && (
                        <div className="fixed inset-0 z-[60] flex items-end justify-center">
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setModals(prev => ({ ...prev, reportBank: false }))}></div>
                            <div className="bg-[#f5f5f4] w-full max-w-[480px] rounded-t-[2.5rem] p-6 shadow-2xl relative z-10 border-t border-white/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-stone-900">Raporttipankki</h3>
                                    <button onClick={() => setModals(prev => ({ ...prev, reportBank: false }))} className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-300 transition-colors"><X size={16}/></button>
                                </div>
                                <p className="text-stone-500 font-medium text-sm mb-6">Valitse mitä raportteja haluat nähdä kojelaudallasi.</p>
                                
                                <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                                    {[
                                        { id: 'hours', title: 'Tuntikertymä', desc: 'Työpöydän päätunnusluku. Näyttää kuluvan kuukauden myytyjen tuntien määrän suhteessa tavoitteeseen.' },
                                        { id: 'revenue', title: 'Operatiivinen kuukausimyynti', desc: 'Näyttää kuluvan ja menneiden kuukausien suuntaa-antavan euromääräisen myyntikertymän.' },
                                        { id: 'streak', title: 'Tavoiteputki', desc: 'Näyttää visuaalisesti, kuinka monena peräkkäisenä kuukautena alue on saavuttanut tavoitteensa.' },
                                        { id: 'tasks', title: 'Rutiinien suoritusaste', desc: 'Kertoo kuinka suuri osa asetetuista rutiineista (esim. soittokierroksista) on tällä hetkellä tehty.' },
                                        { id: 'surveys', title: 'Asiakastyytyväisyys (NPS)', desc: 'Näyttää listana lähiaikoina toteutuneet asiakaskohtaamiset, NPS-luokitukset ja sanalliset palautteet.' },
                                        { id: 'sparraus', title: 'Tekoälyn sparraus', desc: 'Koneälyn tuottamat automaattiset huomiot alueesi tai tiimisi rutiineista.' },
                                        ...(isSuperAdmin ? [
                                            { id: 'overview', title: 'Konsernin tunnusluvut', desc: 'Ylimmän johdon koontinäkymä. Summaa aktiiviset alueet, tunnit ja globaalin NPS-keskiarvon.' },
                                            { id: 'comp_regions', title: 'Alueiden suoritusvertailu', desc: 'Listaa alueet asettaen ne järjestykseen suorituskyvyn (tuntien) perusteella.' },
                                            { id: 'risks', title: 'Asiakasriskit ja laajentuminen', desc: 'Varoittaa automaattisesti ylikuumentuvista alueista ja matalan kapasiteetin yksiköistä.' }
                                        ] : []),
                                        ...(isAdmin && !isSuperAdmin ? [
                                            { id: 'team', title: 'Myyjien suoritustaso', desc: 'Alueesi työntekijöiden tuloslistaus ohjauksen ja vertailun tueksi.' }
                                        ] : []),
                                        ...(isAdmin ? [
                                            { id: 'fin_revenue', title: 'Tilikauden liikevaihto ja muutos-%', desc: 'Kertoo alueen liikevaihdon ja prosentuaalisen kehityksen suhteessa edelliseen tilikauteen.' },
                                            { id: 'fin_ebitda', title: 'Käyttökate (EBITDA)', desc: 'Indikoi operatiivisen toiminnan peruskannattavuutta asettaen sen rinnakkain tulosluistoon.' },
                                            { id: 'fin_ebit', title: 'Liiketulos (EBIT)', desc: 'Liiketoiminnan tulos poistojen jälkeen. Paljastaa miten tuottavaa toiminta on.' },
                                            { id: 'fin_cashflow', title: 'Operatiivinen kassavirta', desc: 'Kuvaa liiketoiminnan jättämää reaalista rahavirtaa ja kassan riittävyyttä.' },
                                            { id: 'fin_equity', title: 'Omavaraisuusaste', desc: 'Prosenttiluku vahvistaa, kuinka suuri osa alueen varallisuudesta on rahoitettu omalla pääomalla.' },
                                            { id: 'fin_quickratio', title: 'Maksuvalmius (Quick Ratio)', desc: 'Happotesti maksuvalmiudelle: kyky selviytyä lyhytaikaisista veloista.' }
                                        ] : [])
                                    ].map(w => (
                                        <div key={w.id} onClick={() => toggleWidget(w.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${activeWidgets.includes(w.id) ? 'bg-white border-[#2f855a] shadow-sm' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}>
                                            <div className="pr-4">
                                                <h4 className={`font-black text-sm mb-1 ${activeWidgets.includes(w.id) ? 'text-[#2f855a]' : 'text-stone-700'}`}>{w.title}</h4>
                                                <p className="text-[10px] text-stone-500 font-medium leading-relaxed">{w.desc}</p>
                                            </div>
                                            <div className={`shrink-0 w-10 h-6 rounded-full flex items-center p-1 transition-colors ${activeWidgets.includes(w.id) ? 'bg-[#2f855a]' : 'bg-stone-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${activeWidgets.includes(w.id) ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setModals(prev => ({ ...prev, reportBank: false }))} className="w-full bg-stone-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">Valmis</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    };

    const renderSurveyApp = () => {
        const { step, company, worker, clientInitials, answers, serviceRatings, planHours, oneOffHours, calculatedBonus } = surveyState;
        const updateState = (updates) => setSurveyState(prev => ({ ...prev, ...updates }));
        const goToStep = (newStep) => updateState({ step: newStep });
        const isSurveyComplete = Object.keys(answers || {}).length === SURVEY_ITEMS.length;

        const renderSurveyCustomer = () => (
            <div className="px-4 pt-6 space-y-6 animate-fade-in pb-12">
                <div className="text-center mb-4"><h2 className="text-2xl font-extrabold text-stone-900">Miten onnistuimme?</h2><p className="text-stone-600 font-medium mt-1">Anna arvio ja paina sopivinta vaihtoehtoa.</p></div>
                <div className="space-y-6 lg:col-span-1">
                    {SURVEY_ITEMS.map(item => {
                        const val = (answers || {})[item.id] || 0;
                        return (
                            <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-stone-200 overflow-hidden">
                                <div className="bg-stone-50 px-5 py-3 border-b border-stone-100"><h3 className="text-sm font-black text-stone-700 uppercase tracking-widest">{item.title}</h3></div>
                                <div className="p-5">
                                    <div className="mb-4">
                                        <p className="text-lg font-medium text-stone-800 leading-snug text-center mb-2">{item.title === '4. SUOSITTELU' ? 'Kuinka todennäköisesti suosittelisit palvelua ystävällesi?' : item.positive}</p>
                                        {item.type !== 'nps' && <div className="flex justify-between gap-4 text-xs text-stone-400 font-medium px-1"><span>{item.negative}</span><span>Täysin samaa mieltä</span></div>}
                                    </div>
                                    {item.type === 'nps' ? (
                                        <div className="w-full pt-4 pb-2 px-1">
                                            <div className="flex justify-between text-xs text-stone-400 font-bold px-1 mb-2"><span>1 (Ei)</span><span>10 (Kyllä)</span></div>
                                            <input type="range" min="1" max="10" step="1" value={val || 5} className="w-full h-4 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#2f855a] z-20" onChange={(e) => updateState({ answers: { ...(answers || {}), [item.id]: parseInt(e.target.value) } })} style={{ opacity: val === 0 ? 0.5 : 1 }} />
                                            <div className="text-center mt-4 h-8"><span className={`text-4xl font-black ${val === 0 ? 'text-stone-300' : 'text-[#2f855a]'}`}>{val === 0 ? '?' : val}</span></div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center gap-1">
                                            {EMOJI_SCALE.map(scale => {
                                                const isSel = scale.value === val;
                                                return <button key={scale.value} onClick={() => updateState({ answers: { ...(answers || {}), [item.id]: scale.value } })} className={`relative flex flex-col items-center justify-center w-12 h-14 sm:w-14 sm:h-16 rounded-2xl transition-all duration-200 border ${isSel ? `scale-110 -translate-y-1 z-10 shadow-lg ${scale.color} ring-2 ring-offset-2 ring-stone-400` : 'bg-stone-50 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white border-transparent'}`}><span className="text-3xl sm:text-4xl select-none filter drop-shadow-sm">{scale.emoji}</span></button>
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="pt-4">
                    <button onClick={() => goToStep('worker')} disabled={!isSurveyComplete} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl flex items-center justify-center gap-3 transition-all ${isSurveyComplete ? 'bg-[#2f855a] text-white hover:bg-[#22543d] active:scale-95' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>Jatka <ArrowRight className="w-6 h-6" /></button>
                    {!isSurveyComplete && <p className="text-center text-[#2f855a] font-bold mt-3">Vastaathan kaikkiin kohtiin.</p>}
                </div>
            </div>
        );

        const renderSurveyWorker = () => {
            const coach = getCoachSummary(answers);
            if(!coach) return null;
            const highNeeds = [], mediumNeeds = [];
            SERVICE_NEEDS.forEach(item => { const r = (serviceRatings || {})[item.id] || 0; if(r >= 4) highNeeds.push(item); else if (r === 3) mediumNeeds.push(item); });

            return (
                <div className="px-4 pt-6 space-y-8 animate-fade-in pb-12">
                    <div>
                        <h2 className="text-xl font-extrabold text-stone-800 mb-4 flex items-center gap-2"><Activity className="text-[#22543d]"/> Palautteen analyysi</h2>
                        <div className={`rounded-[2rem] border p-6 shadow-sm ${coach.summaryColor}`}>
                            <h3 className="font-black text-sm uppercase tracking-widest mb-3 border-b border-black/10 pb-2 opacity-90">{coach.summaryTitle}</h3>
                            <div className="bg-white/80 rounded-xl p-5 border border-black/5 relative mt-5 shadow-sm">
                                <div className="absolute -top-3 left-4 bg-stone-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">Sano esimerkiksi näin</div>
                                <p className="text-stone-800 font-medium italic mt-1 leading-relaxed" dangerouslySetInnerHTML={{__html: `"${coach.scriptText}"`}}></p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-2"><HeartHandshake className="text-stone-500 w-6 h-6"/><h3 className="text-base font-black text-stone-700 uppercase tracking-widest">Hyvinvointikartoitus</h3></div>
                            <div className="ml-1 bg-[#f0fdf4] border border-[#dcfce7] p-5 rounded-2xl relative mt-4 shadow-sm">
                                <div className="absolute -top-3 left-4 bg-[#2f855a] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Avausrepliikki</div>
                                <p className="text-lg font-bold text-[#22543d] leading-snug">"Sopiiko, että kartoitetaan tämän hetken palvelun tarvetta ja riittävyyttä?"</p>
                            </div>
                        </div>
                        <div className="space-y-4 pt-2">
                            {SERVICE_NEEDS.map(item => {
                                const r = (serviceRatings || {})[item.id] || 0;
                                return (
                                    <div key={item.id} className="rounded-2xl border bg-white border-stone-200 p-5 shadow-sm">
                                        <div className="flex items-start gap-3 mb-3"><div className="bg-stone-50 p-3 rounded-full border border-stone-100 shrink-0 text-[#22543d]">{getIconByName(item.icon, {className: "w-6 h-6"})}</div><div><h4 className="font-bold text-stone-800 text-base">{item.title}</h4><p className="text-xs text-stone-500 mt-1 italic leading-snug">{item.prompt}</p></div></div>
                                        <div className="w-full px-1 pt-2">
                                            <div className="flex items-center gap-3"><span className="text-xs font-bold text-stone-400 w-4">1</span><input type="range" min="1" max="5" step="1" value={r || 1} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#2f855a]" onChange={e => updateState({ serviceRatings: { ...(serviceRatings || {}), [item.id]: parseInt(e.target.value) } })} style={{ opacity: r === 0 ? 0.5 : 1 }} /><span className="text-xs font-bold text-stone-400 w-4">5</span></div>
                                            <div className="flex justify-between text-[10px] text-stone-400 px-1 mt-1 font-medium"><span>Ei tarvetta</span><span>Toivoisin tukea</span></div>
                                            <div className="text-center font-bold text-[#2f855a] text-xl mt-1 h-6">{r > 0 ? r : <span className="text-stone-300 text-sm font-normal">Arvioi vetämällä</span>}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-6">
                            <div className={`rounded-[2rem] border ${highNeeds.length > 0 ? 'bg-[#f0fdf4] border-[#dcfce7] ring-1 ring-[#2f855a]/30' : mediumNeeds.length > 0 ? 'bg-[#fdf2f2] border-[#fde8e8]' : 'bg-stone-100 border-stone-200'} p-6 shadow-sm transition-all`}>
                                {highNeeds.length > 0 ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-3 text-[#22543d] font-black text-sm uppercase tracking-wider"><Lightbulb className="w-5 h-5"/> 💡 Hyvinvointia tukeva ehdotus</div>
                                        <p className="text-stone-800 text-base mb-3 leading-relaxed font-medium italic">"Huomasin, että toivoisit tukea alueilla <strong>{highNeeds.map(i=>i.title).join(" ja ")}</strong>. Meillä on siihen ratkaisu, joka helpottaisi arkeasi. Miltä kuulostaisi, jos kokeilisimme tätä?"</p>
                                        <div className="bg-white/80 p-4 rounded-xl border border-[#dcfce7] mb-5 shadow-sm">
                                            <p className="text-xs font-bold text-[#2f855a] uppercase mb-1">Tarjoa esimerkiksi näitä:</p>
                                            {highNeeds.map(item => item.subServices ? <div key={item.id}><strong className="block text-stone-800 mt-2 text-xs uppercase tracking-wide">{item.title}:</strong><ul className="list-disc pl-5 mt-1 text-stone-600 text-sm">{item.subServices.map((s, idx)=><li key={idx}>{s}</li>)}</ul></div> : null)}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-colors"><input type="radio" checked={surveyState.proposalStatus === 'none'} onChange={() => updateState({proposalStatus: 'none'})} className="w-5 h-5 text-stone-600" /><span className="text-sm text-stone-700 font-medium">Ei kiitos</span></label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-colors"><input type="radio" checked={surveyState.proposalStatus === 'interested'} onChange={() => updateState({proposalStatus: 'interested'})} className="w-5 h-5 text-[#9b2c2c]" /><span className="text-sm text-stone-800 font-bold">Kiinnostui (Soittakaa myöhemmin)</span></label>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-[#dcfce7] border border-[#2f855a]/30 shadow-sm"><label className="flex items-center gap-3 cursor-pointer flex-1"><input type="radio" checked={surveyState.proposalStatus === 'sold'} onChange={() => updateState({proposalStatus: 'sold'})} className="w-5 h-5 text-[#2f855a] accent-[#2f855a]" /><span className="text-base font-black text-[#22543d]">Myyty!</span></label></div>
                                        </div>
                                    </>
                                ) : mediumNeeds.length > 0 ? (
                                    <><div className="flex items-center gap-2 mb-2 text-[#2f855a] font-black text-xs uppercase tracking-wider"><HelpCircle className="w-5 h-5"/> Kartoita tarkemmin</div><p className="text-sm text-stone-800 font-medium">Asiakkaalla on heräävää kiinnostusta alueilla: <strong>{mediumNeeds.map(i=>i.title).join(", ")}</strong>. Kysy tarkentavia kysymyksiä.</p></>
                                ) : <p className="text-sm font-medium text-stone-500 text-center py-2">Arki sujuu hyvin / ei tarvetta lisätuelle.</p>}
                            </div>
                        </div>
                    </div>

                    <div className={`bg-white rounded-[2rem] shadow-xl border border-stone-200 overflow-hidden relative transition-all ${!coach.isSalesRecommended ? '' : ''}`}>
                        <div className="bg-[#132e21] p-5 border-b border-[#22543d] flex items-center gap-4"><div className="bg-white/10 p-3 rounded-xl text-white shadow-inner"><TrendingUp className="w-6 h-6"/></div><div><h3 className="font-extrabold text-white text-xl leading-none tracking-wide">Lisämyynti</h3><p className="text-[#dcfce7] text-xs mt-1.5 font-medium">Kirjaa sovitut työt</p></div></div>
                        {!coach.isSalesRecommended && <div className="bg-[#fdf2f2] p-5 border-b border-[#fde8e8] text-[#9b2c2c] text-sm font-bold flex items-center gap-3"><AlertTriangle className="w-6 h-6 flex-shrink-0"/><span>Suositus: Keskity ensisijaisesti korjaamiseen. Myy vain, jos tilanne on purettu.</span></div>}
                        <div className="p-6 space-y-6">
                            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Calendar className="text-[#2f855a] w-5 h-5"/><span className="text-sm font-black text-stone-800 uppercase tracking-wide">Jatkuva palvelu</span></div><span className="text-xs font-bold bg-white text-[#2f855a] px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm">~40€ / h bonus</span></div>
                                <div className="flex items-center bg-white rounded-xl p-1.5 shadow-sm border border-stone-200 w-full max-w-[200px]">
                                    <button onClick={() => updateState({ planHours: Math.max(0, planHours - 0.5) })} className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center transition-colors"><Minus className="w-5 h-5"/></button>
                                    <div className="flex-1 text-center font-black text-2xl text-stone-800">{planHours} <span className="text-sm text-stone-400 font-bold">h</span></div>
                                    <button onClick={() => updateState({ planHours: planHours + 0.5 })} className="w-10 h-10 rounded-lg bg-[#2f855a] text-white hover:bg-[#22543d] flex items-center justify-center transition-colors"><Plus className="w-5 h-5"/></button>
                                </div>
                            </div>

                            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Sparkles className="text-[#2f855a] w-5 h-5"/><span className="text-sm font-black text-stone-800 uppercase tracking-wide">Kertamyynti</span></div><span className="text-xs font-bold bg-white text-[#2f855a] px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm">5€ / h bonus</span></div>
                                <div className="flex items-center bg-white rounded-xl p-1.5 shadow-sm border border-stone-200 w-full max-w-[200px]">
                                    <button onClick={() => updateState({ oneOffHours: Math.max(0, oneOffHours - 0.5) })} className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center transition-colors"><Minus className="w-5 h-5"/></button>
                                    <div className="flex-1 text-center font-black text-2xl text-stone-800">{oneOffHours} <span className="text-sm text-stone-400 font-bold">h</span></div>
                                    <button onClick={() => updateState({ oneOffHours: oneOffHours + 0.5 })} className="w-10 h-10 rounded-lg bg-[#2f855a] text-white hover:bg-[#22543d] flex items-center justify-center transition-colors"><Plus className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <input type="text" placeholder="Mitä sovittiin?" value={surveyState.salesNote} onChange={e => updateState({salesNote: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-base font-medium text-stone-800 placeholder-stone-400 focus:border-[#2f855a] outline-none shadow-inner" />
                        </div>
                    </div>

                    <button onClick={submitSurvey} disabled={surveyState.isSubmitting} className="w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 bg-[#2f855a] text-white hover:bg-[#22543d] active:scale-95 transition-all">
                        {surveyState.isSubmitting ? <><Loader2 className="w-6 h-6 animate-spin"/> Lähetetään...</> : <>Hyväksy & Lopeta <Send className="w-6 h-6"/></>}
                    </button>
                </div>
            )
        };

        return (
            <div className="bg-[#e7e5e4] min-h-screen font-sans">
                {step !== 'login' && step !== 'success' && (
                    <div className="bg-white shadow-sm sticky top-0 z-30 border-b border-stone-200 animate-fade-in">
                        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
                            <div className="flex gap-4 text-stone-500">
                                <button onClick={() => {
                                    if (step === 'worker') setSurveyState(prev => ({...prev, step: 'customer'}));
                                    else if (step === 'customer') setSurveyState(prev => ({...prev, step: 'login'}));
                                }} className="hover:text-[#2f855a] transition-colors"><ChevronLeft size={20}/></button>
                                <button onClick={() => setCurrentView((authSession && authSession.status === 'active') ? 'portal' : 'simulator_login')} className="hover:text-[#2f855a] transition-colors"><Home size={20}/></button>
                            </div>
                            <div className="flex flex-col"><span className="font-bold text-stone-900 text-sm tracking-wide">{company}</span></div>
                            <button onClick={()=>setCurrentView('portal')} className="text-stone-400 hover:text-[#9b2c2c] transition-colors"><X size={20}/></button>
                        </div>
                    </div>
                )}

                <div className="max-w-md mx-auto w-full flex flex-col justify-center min-h-[100dvh] bg-[#f5f5f4] shadow-2xl relative pb-12">
                    {step === 'login' && (
                        <div className="p-4 flex flex-col justify-center grow my-auto">
                            <div className="w-full bg-[#f5f5f4] rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200 animate-fade-in relative z-10">
                                <button onClick={() => setCurrentView('portal')} className="absolute top-5 left-5 text-stone-500 hover:text-[#2f855a] hover:bg-black/5 p-2 z-20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                                <button onClick={() => setCurrentView((authSession && authSession.status === 'active') ? 'portal' : 'simulator_login')} className="absolute top-5 right-5 text-stone-500 hover:text-[#2f855a] hover:bg-black/5 p-2 z-20 rounded-full transition-colors"><Home size={24} /></button>
                                
                                <div className="bg-gradient-to-br from-[#22543d] to-[#2f855a] p-10 text-white text-center pt-20 relative flex flex-col items-center">
                                    <h1 className="text-4xl font-black mb-1 tracking-tighter">Famula</h1>
                                    <p className="text-[#a7f3d0] font-bold text-xs uppercase tracking-widest">Asiakastyytyväisyys</p>
                                </div>
                                
                                <div className="p-8 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-stone-800 mb-2 ml-1">Kenen luona olemme?</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-stone-400" />
                                            </div>
                                            <input type="text" placeholder="Asiakkaan nimikirjaimet esim. M.M." value={clientInitials} onChange={e => updateState({clientInitials: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl outline-none text-lg font-bold text-stone-800 shadow-sm focus:border-[#2f855a] focus:ring-4 focus:ring-[#2f855a]/10 transition-all placeholder-stone-400" />
                                        </div>
                                    </div>
                                    <button onClick={() => { updateState({ sessionId: `#${Math.floor(1000 + Math.random() * 9000)}` }); goToStep('customer'); }} disabled={clientInitials.length < 2} className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg mt-4 transition-all duration-300 flex items-center justify-center gap-2 ${clientInitials.length > 1 ? 'bg-gradient-to-r from-[#2f855a] to-[#22543d] text-white hover:scale-[1.02] active:scale-95 hover:shadow-2xl' : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-70'}`}>
                                        Aloita kysely {clientInitials.length > 1 && <ArrowRight className="w-5 h-5 animate-pulse"/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 'customer' && renderSurveyCustomer()}
                    {step === 'worker' && renderSurveyWorker()}
                    {step === 'success' && <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#22543d] to-[#2f855a] fixed top-0 left-0 w-full z-50 animate-fade-in"><div className="w-full max-w-md bg-[#f5f5f4] rounded-[2.5rem] shadow-2xl p-10 text-center"><button onClick={handleStartSurveyView} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold shadow-lg">Uusi kirjaus</button><button onClick={()=>setCurrentView('portal')} className="w-full py-4 mt-4 bg-white text-stone-900 rounded-2xl font-bold shadow-sm">Palaa portaaliin</button></div></div>}
                </div>
            </div>
        );
    };

    return (
        <div className="font-sans antialiased bg-[#e7e5e4] min-h-screen flex flex-col">
            {(authSession?.realRole === 'superadmin' && currentView !== 'simulator_login') && (
                <div className="w-full bg-stone-900 text-white p-3 flex flex-col sm:flex-row items-center justify-center z-[100] shadow-md gap-3 sticky top-0 border-b border-stone-800">
                    <span className="text-xs font-bold text-[#facc15] uppercase tracking-widest whitespace-nowrap"><Settings className="w-4 h-4 inline mr-1.5 mb-0.5 text-[#facc15] animate-pulse"/> Testitila</span>
                    <div className="flex gap-2 w-full sm:w-auto max-w-md">
                        <select value={authSession.role} onChange={e => setAuthSession({...authSession, role: e.target.value})} className="bg-stone-800 text-white text-[11px] font-bold p-2.5 rounded-lg outline-none border border-stone-700 flex-1 focus:border-[#facc15] transition-colors">
                            <option value="superadmin">Suomi (Superadmin)</option>
                            <option value="admin">Aluevetäjä</option>
                            <option value="myyja">Myyjä</option>
                        </select>
                        <select value={authSession.regionId} onChange={e => setAuthSession({...authSession, regionId: e.target.value})} className="bg-stone-800 text-white text-[11px] font-bold p-2.5 rounded-lg outline-none border border-stone-700 flex-1 focus:border-[#facc15] transition-colors">
                            {activeRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
            {toast.visible && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-[400px] animate-fade-in">
                    <div className="bg-[#132e21] text-white p-4 px-6 rounded-2xl shadow-2xl flex items-center border border-[#22543d]">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0 bg-[#2f855a]"><Check className="text-white h-3 w-3" /></div>
                        <span className="font-bold text-sm tracking-wide leading-snug">{toast.message}</span>
                    </div>
                </div>
            )}
            {currentView === 'simulator_login' && renderSimulatorLogin()}
            {currentView === 'pending_access' && renderPendingAccess()}
            {currentView === 'portal' && renderPortal()}
            {currentView === 'manager' && renderManager()}
            {currentView === 'survey' && renderSurveyApp()}
        </div>
    );
}