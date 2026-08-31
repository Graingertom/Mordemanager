/*
============================================================
MORDEMANAGER - DATA LAYER
============================================================
*/

const DATA_PATHS = {

    core:
        "./data/rules/core.json",

    equipment:
        "./data/rules/equipment.json",

    skills:
        "./data/rules/skills.json",

    reikland:
        "./data/rules/warbands/reikland.json",

    playerWarbands:
        "./data/app/warbands.json",

    games:
        "./data/app/games.json"

};



export async function loadRules() {

    const [

        core,
        equipment,
        skills,
        reikland

    ] = await Promise.all([

        loadJson(DATA_PATHS.core),

        loadJson(DATA_PATHS.equipment),

        loadJson(DATA_PATHS.skills),

        loadJson(DATA_PATHS.reikland)

    ]);


    return {

        core,

        equipment,

        skills,

        warbands: {

            reikland

        }

    };

}


export async function loadPlayerData() {

    let warbands = [];

    let games = [];


    /*
     * Local storage is currently our writable
     * client-side database.
     */

    try {

        const stored =
            localStorage.getItem(
                "mordemanager-warbands"
            );


        if (stored) {

            const parsed =
                JSON.parse(stored);

            warbands =
                Array.isArray(parsed.warbands)
                    ? parsed.warbands
                    : [];

        }

    } catch (error) {

        console.warn(
            "Unable to read saved warbands:",
            error
        );

    }


    /*
     * If nothing has been saved yet, load the
     * initial JSON seed.
     */

    if (warbands.length === 0) {

        try {

            const data =
                await loadJson(
                    DATA_PATHS.playerWarbands
                );


            warbands =
                Array.isArray(data.warbands)
                    ? data.warbands
                    : [];

        } catch (error) {

            console.warn(
                "No initial warband data available."
            );

        }

    }


    /*
     * Games are currently read-only seed data.
     */

    try {

        const data =
            await loadJson(
                DATA_PATHS.games
            );


        games =
            Array.isArray(data.games)
                ? data.games
                : [];

    } catch (error) {

        console.warn(
            "No game data available."
        );

    }


    return {

        warbands,

        games

    };

}


export function savePlayerData(warbands, games = []) {

    try {

        localStorage.setItem(

            "mordemanager-warbands",

            JSON.stringify({

                warbands

            })

        );


        localStorage.setItem(

            "mordemanager-games",

            JSON.stringify({

                games

            })

        );


        return true;

    } catch (error) {

        console.error(
            "Unable to save application data:",
            error
        );


        return false;

    }

}


export function clearSavedData() {

    localStorage.removeItem(
        "mordemanager-warbands"
    );


    localStorage.removeItem(
        "mordemanager-games"
    );

}


async function loadJson(path) {

    const response =
        await fetch(path);


    if (!response.ok) {

        throw new Error(
            `Unable to load ${path}: ${response.status}`
        );

    }


    return response.json();

}
