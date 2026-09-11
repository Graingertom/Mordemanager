/* ============================================================
   MORDEMANAGER
   Iteration 2 - Data Driven Warband Manager
   ============================================================ */

const APP_VERSION = "0.2.1";


/* ============================================================
   DATA PATHS
   ============================================================ */

/*
 * Cache-busted the same way as the script tags in index.html -
 * these are plain fetch()es with no version param, so a browser
 * (or GitHub Pages' CDN) could just as easily serve a stale copy
 * of the rules data as it could stale JS. Bump DATA_VERSION
 * whenever any data/rules/*.json file changes.
 */

const DATA_VERSION = 3;

const DATA_PATHS = {

    core: `./data/rules/core.json?v=${DATA_VERSION}`,

    equipment: `./data/rules/equipment.json?v=${DATA_VERSION}`,

    skills: `./data/rules/skills.json?v=${DATA_VERSION}`,

    injuries: `./data/rules/injuries.json?v=${DATA_VERSION}`,

    reikland: `./data/rules/warbands/reikland.json?v=${DATA_VERSION}`

};


/* ============================================================
   APPLICATION STATE
   ============================================================ */

const state = {

    core: null,

    equipment: null,

    skills: null,

    injuries: null,

    warbandDefinitions: {
        reikland: null
    },

    warbands: [],

    games: [],

    currentWarbandId: null,

    currentGameId: null,

    /*
     * Set when a warband is opened from within a game,
     * so its back button can return there instead of
     * always going to the dashboard.
     */

    returnToGameId: null,

    currentModal: null,

    /*
     * Retired warbands are hidden from the dashboard
     * by default - this reveals them. UI-only, not
     * persisted.
     */

    showRetiredWarbands: false,

    /*
     * Minimal {id, name, owner, fighterCount} entries for
     * warbands in a shared game that the viewer doesn't own
     * (via search_warbands/get_warband_stubs) - never holds
     * treasury, equipment or fighters. Keyed by warband id.
     */

    warbandStubs: {},

    /*
     * Real Supabase auth. Not yet wired into warband
     * ownership - see js/auth.js.
     */

    session: null,

    profile: null,

    /*
     * Friends system - see js/friends.js. friends/incoming/
     * outgoing are loaded from the friendships table; viewing
     * a friend's warbands/games goes through read-only RPCs
     * and is cached here rather than mixed into state.warbands.
     */

    showFriendsPage: false,

    friends: [],

    incomingRequests: [],

    outgoingRequests: [],

    viewingFriendId: null,

    viewingFriendName: null,

    friendWarbands: [],

    friendGames: []

};


/* ============================================================
   INITIALISATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initialise
);


async function initialise() {

    console.log(
        `Mordemanager ${APP_VERSION} starting...`
    );


    /*
     * Waits until the initial signed-in/signed-out state is
     * known before loading anything that depends on it. Also
     * sets up the listener for later sign-in/sign-out changes.
     */

    await initAuth();


    try {

        await loadRules();

        await loadPlayerData();

        renderApplication();

    } catch (error) {

        console.error(
            "Application failed to initialise:",
            error
        );

        renderFatalError(error);

    }

}


/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadRules() {

    const responses = await Promise.all([

        fetch(DATA_PATHS.core),

        fetch(DATA_PATHS.equipment),

        fetch(DATA_PATHS.skills),

        fetch(DATA_PATHS.injuries),

        fetch(DATA_PATHS.reikland)

    ]);


    const paths = [

        DATA_PATHS.core,

        DATA_PATHS.equipment,

        DATA_PATHS.skills,

        DATA_PATHS.injuries,

        DATA_PATHS.reikland

    ];


    responses.forEach(
        (response, index) => {

            if (!response.ok) {

                throw new Error(
                    `Unable to load ${paths[index]} (${response.status})`
                );

            }

        }
    );


    const [

        core,

        equipment,

        skills,

        injuries,

        reikland

    ] = await Promise.all(

        responses.map(
            response =>
                response.json()
        )

    );


    state.core = core;

    state.equipment = equipment;

    state.skills = skills;

    state.injuries = injuries;

    state.warbandDefinitions.reikland =
        reikland;


    console.log(
        "Rules loaded successfully."
    );

}


/* ============================================================
   PLAYER DATA
   ============================================================ */

/*
 * Pulled fresh from Supabase every time this runs - called once
 * at startup and again whenever auth.js's listener sees a
 * sign-in/sign-out. Row Level Security means a signed-out client
 * would just get nothing back anyway, but checking locally first
 * avoids firing queries that can only ever come back empty.
 */

/*
 * Each of these is a flat, single-table query - deliberately NOT
 * embedding fighters under warbands, or game_warbands/settlements
 * under games. Postgres's RLS recursion detector flags a cycle
 * whenever a nested table's policy queries a table that's already
 * "in flight" in the same combined statement (e.g. fighters'
 * policy querying warbands, while warbands is the outer table of
 * the very query being planned) - even though each table's policy
 * is perfectly fine on its own. Querying them separately and
 * merging in JS sidesteps that entirely.
 */

async function loadPlayerData() {

    const user =
        getCurrentUser();


    if (!user) {

        state.warbands = [];

        state.games = [];

        state.friends = [];

        state.incomingRequests = [];

        state.outgoingRequests = [];

        return;

    }


    const [
        { data: warbandRows, error: warbandError },
        { data: fighterRows, error: fighterError },
        { data: gameRows, error: gameError },
        { data: gameWarbandRows, error: gameWarbandError },
        { data: settlementRows, error: settlementError }
    ] = await Promise.all([

        supabaseClient
            .from("warbands")
            .select(`
                id,
                ownerId:owner_id,
                name,
                type,
                treasury,
                stash,
                status,
                createdAt:created_at,
                owner:profiles(display_name)
            `),

        supabaseClient
            .from("fighters")
            .select(`
                id,
                warbandId:warband_id,
                type,
                typeName:type_name,
                category,
                name,
                profile,
                baseCost:base_cost,
                equipment,
                skills,
                experience,
                advances,
                injuries
            `),

        supabaseClient
            .from("games")
            .select(`
                id,
                name,
                gameMasterId:game_master_id,
                status,
                createdAt:created_at,
                scenarioName:scenario_name,
                scenarioDescription:scenario_description,
                gameMaster:profiles(display_name)
            `),

        supabaseClient
            .from("game_warbands")
            .select(`
                gameId:game_id,
                warbandId:warband_id
            `),

        supabaseClient
            .from("settlements")
            .select(`
                id,
                gameId:game_id,
                name,
                note,
                warbandId:warband_id
            `)

    ]);


    if (warbandError || fighterError) {

        console.error(
            "Unable to load warbands:",
            (warbandError || fighterError).message
        );

        state.warbands = [];

    } else {

        const fightersByWarband = {};

        for (const fighter of fighterRows || []) {

            (fightersByWarband[fighter.warbandId] ||= [])
                .push(fighter);

        }

        state.warbands =
            normaliseWarbands(
                (warbandRows || []).map(
                    row => ({

                        ...row,

                        owner:
                            row.owner?.display_name || "",

                        fighters:
                            fightersByWarband[row.id] || []

                    })
                )
            );

    }


    if (gameError || gameWarbandError || settlementError) {

        console.error(
            "Unable to load games:",
            (gameError || gameWarbandError || settlementError).message
        );

        state.games = [];

    } else {

        const warbandIdsByGame = {};

        for (const link of gameWarbandRows || []) {

            (warbandIdsByGame[link.gameId] ||= [])
                .push(link.warbandId);

        }

        const settlementsByGame = {};

        for (const settlement of settlementRows || []) {

            (settlementsByGame[settlement.gameId] ||= [])
                .push(settlement);

        }

        state.games =
            normaliseGames(
                (gameRows || []).map(
                    row => ({

                        ...row,

                        gameMaster:
                            row.gameMaster?.display_name || "",

                        warbandIds:
                            warbandIdsByGame[row.id] || [],

                        settlements:
                            settlementsByGame[row.id] || [],

                        scenario: {

                            name:
                                row.scenarioName || "",

                            description:
                                row.scenarioDescription || ""

                        }

                    })
                )
            );

    }


    await loadFriendData();

}


/* ============================================================
   APPLICATION RENDERING
   ============================================================ */

function renderApplication() {

    const app =
        document.getElementById("app");


    if (!app) {

        throw new Error(
            "Could not find #app in index.html"
        );

    }


    if (state.currentGameId) {

        renderGamePage();

    } else if (state.currentWarbandId) {

        renderWarbandPage();

    } else if (state.viewingFriendId) {

        renderFriendDetailPage();

    } else if (state.showFriendsPage) {

        renderFriendsPage();

    } else {

        renderDashboard();

    }

}


/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {

    const app =
        document.getElementById("app");


    const user =
        getCurrentUser();


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <div class="mm-logo">
                        ☠ MORDEMANAGER
                    </div>

                    <div class="mm-subtitle">
                        Mordheim Warband Manager
                    </div>

                </div>


                <div class="mm-header-actions">

                    ${renderAuthControl()}


                    ${
                        user
                            ? `
                                <button
                                    class="mm-button"
                                    onclick="showFriendsPage()"
                                >
                                    Friends
                                    ${state.incomingRequests.length
                                        ? `
                                            <span class="mm-badge-count">
                                                ${state.incomingRequests.length}
                                            </span>
                                        `
                                        : ""}
                                </button>
                            `
                            : ""
                    }

                </div>

            </header>


            <main class="mm-main">

                ${
                    user
                        ? `

                            <section class="mm-section">

                                <div class="mm-section-header">

                                    <div>

                                        <h2>
                                            My Warbands
                                        </h2>

                                        <p>
                                            Manage your warbands,
                                            fighters, equipment
                                            and campaigns.
                                        </p>

                                    </div>


                                    <button
                                        class="mm-button mm-button-primary"
                                        onclick="showCreateWarband()"
                                    >
                                        + New Warband
                                    </button>

                                </div>


                                ${renderWarbandCards()}

                            </section>


                            ${renderActiveGames()}

                        `
                        : `

                            <section class="mm-empty-state">

                                <div class="mm-empty-icon">
                                    ☠
                                </div>

                                <h2>
                                    Sign In To Get Started
                                </h2>

                                <p>
                                    Sign in to create and manage
                                    your warbands and games.
                                </p>

                                <button
                                    class="mm-button mm-button-primary"
                                    onclick="showSignIn()"
                                >
                                    Sign In
                                </button>

                            </section>

                        `
                }


                ${renderAcknowledgement()}

            </main>

        </div>


        <div id="modal-container"></div>

    `;

}


/* ============================================================
   FATAL ERROR
   ============================================================ */

function renderFatalError(
    error
) {

    const app =
        document.getElementById(
            "app"
        );


    if (!app) {

        return;

    }


    app.innerHTML = `

        <div class="mm-error-page">

            <h1>
                ☠ Mordemanager
            </h1>


            <h2>
                Unable to load the application
            </h2>


            <p>
                ${escapeHtml(
                    error?.message ||
                    error ||
                    "Unknown error"
                )}
            </p>


            <p>
                Check the browser console
                for more information.
            </p>

        </div>

    `;

}


/* ============================================================
   PUBLIC DEBUG / APPLICATION API
   ============================================================ */

/*
 * Add the application-level functions to the existing
 * MordeManager object.
 *
 * IMPORTANT:
 * Do not replace window.MordeManager with a new object here.
 * Other modules such as fighters.js and equipment.js may
 * already have registered their functions on it.
 */

window.MordeManager =
    window.MordeManager || {};


Object.assign(
    window.MordeManager,
    {

        state,

        loadPlayerData,

        calculateWarbandRating,

        calculateWarbandValue,

        calculateFighterCost,

        getEquipment,

        openWarband,

        closeWarband,

        openGame,

        closeGame,

        showEquipment

    }
);


console.log(
    `Mordemanager ${APP_VERSION} loaded.`
);
