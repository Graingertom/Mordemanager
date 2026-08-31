/* ============================================================
   MORDEMANAGER
   Iteration 2 - Data Driven Warband Manager
   ============================================================ */

const APP_VERSION = "0.2.1";


/* ============================================================
   DATA PATHS
   ============================================================ */

const DATA_PATHS = {

    core: "./data/rules/core.json",

    equipment: "./data/rules/equipment.json",

    skills: "./data/rules/skills.json",

    reikland: "./data/rules/warbands/reikland.json",

    playerWarbands: "./data/app/warbands.json",

    games: "./data/app/games.json"

};


/* ============================================================
   APPLICATION STATE
   ============================================================ */

const state = {

    core: null,

    equipment: null,

    skills: null,

    warbandDefinitions: {
        reikland: null
    },

    warbands: [],

    games: [],

    currentWarbandId: null,

    currentModal: null

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

        fetch(DATA_PATHS.reikland)

    ]);


    const paths = [

        DATA_PATHS.core,

        DATA_PATHS.equipment,

        DATA_PATHS.skills,

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

    state.warbandDefinitions.reikland =
        reikland;


    console.log(
        "Rules loaded successfully."
    );

}


/* ============================================================
   PLAYER DATA
   ============================================================ */

async function loadPlayerData() {

    let storedData = null;


    /*
     * Try localStorage first.
     */

    try {

        storedData =
            localStorage.getItem(
                "mordemanager-warbands"
            );

    } catch (error) {

        console.warn(
            "localStorage unavailable:",
            error
        );

    }


    if (storedData) {

        try {

            const parsed =
                JSON.parse(storedData);


            state.warbands =
                normaliseWarbands(
                    parsed.warbands || []
                );

        } catch (error) {

            console.warn(
                "Saved warband data could not be parsed.",
                error
            );

            state.warbands = [];

        }

    } else {

        /*
         * No saved local data.
         *
         * Load initial development data.
         */

        try {

            const response =
                await fetch(
                    DATA_PATHS.playerWarbands
                );


            if (response.ok) {

                const data =
                    await response.json();


                state.warbands =
                    normaliseWarbands(
                        data.warbands || []
                    );

            } else {

                console.warn(
                    "Initial warbands file returned:",
                    response.status
                );

                state.warbands = [];

            }

        } catch (error) {

            console.warn(
                "No initial player warbands found."
            );

            state.warbands = [];

        }

    }


    /*
     * Games remain separate for now.
     */

    try {

        const response =
            await fetch(
                DATA_PATHS.games
            );


        if (response.ok) {

            const data =
                await response.json();


            state.games =
                Array.isArray(data.games)
                    ? data.games
                    : [];

        } else {

            state.games = [];

        }

    } catch (error) {

        console.warn(
            "Games data could not be loaded."
        );

        state.games = [];

    }

}


/* ============================================================
   PERSISTENCE
   ============================================================ */

function savePlayerData() {

    try {

        localStorage.setItem(

            "mordemanager-warbands",

            JSON.stringify({

                warbands:
                    state.warbands

            })

        );


        console.log(
            "Warbands saved."
        );

    } catch (error) {

        console.error(
            "Unable to save warbands:",
            error
        );

    }

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


    if (state.currentWarbandId) {

        renderWarbandPage();

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

                    <button
                        class="mm-button mm-button-primary"
                        onclick="showCreateWarband()"
                    >
                        + New Warband
                    </button>

                </div>

            </header>


            <main class="mm-main">

                <section class="mm-page-title">

                    <div>

                        <h1>
                            My Warbands
                        </h1>

                        <p>
                            Manage your warbands,
                            fighters, equipment
                            and campaigns.
                        </p>

                    </div>

                </section>


                ${renderWarbandCards()}


                ${renderActiveGames()}


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

        savePlayerData,

        calculateWarbandRating,

        calculateWarbandValue,

        calculateFighterCost,

        getEquipment,

        openWarband,

        closeWarband,

        showEquipment,

        showTrait

    }
);


console.log(
    `Mordemanager ${APP_VERSION} loaded.`
);
