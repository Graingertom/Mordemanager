/* ============================================================
   MORDEMANAGER
   Fighter Management
   ============================================================ */


/*
 * Working copy of the fighter currently open in the editor's
 * injury list - kept separate from fighter.injuries so Cancel
 * discards unsaved additions/removals, matching how equipment
 * changes only commit on Save Fighter.
 */

let editingInjuries = [];


/*
 * Same pattern as editingInjuries, for the fighter game-update
 * modal's skill picker. editingSkillOptions is the fixed list of
 * skills this fighter is eligible for (by category access),
 * computed once when the modal opens; editingSkills starts as a
 * copy of the fighter's existing skills and grows as new ones are
 * added, so the "already known" exclusion and the "no duplicates"
 * rule both fall out of the same check.
 */

let editingSkills = [];

let editingSkillOptions = [];


/*
 * Same staging pattern, for showEditFighter's Spells/Mutations
 * sections - only re-seeded from the real fighter on a fresh open
 * of that modal (tracked via editFighterId), so adding a spell or
 * mutation can re-render the modal in place without losing other
 * unsaved staged changes.
 */

let editingFighterSpells = [];

let editingFighterMutations = [];

let editFighterId = null;


/*
 * Advance-related staging for the fighter game-update modal.
 * editingProfile/editingCategory are working copies so a
 * characteristic increase or a promotion doesn't touch the real
 * fighter until Save, same as everything else in this modal.
 * gameUpdateFighterId tracks which fighter is currently staged, so
 * showFighterGameUpdate() can be safely re-invoked (e.g. right
 * after recording an advance, or after a promotion changes which
 * sections should show) WITHOUT re-seeding over staged-but-unsaved
 * changes - pushModal snapshots the parent modal's HTML as a
 * static string, so goBackModal() can't reflect state changes made
 * while a child modal was open; re-rendering via
 * showFighterGameUpdate() directly is what actually shows them.
 */

let editingAdvances = [];

let editingProfile = {};

let editingCategory = null;

let gameUpdateFighterId = null;

/*
 * The deduplicated advance-outcome rows currently shown by
 * showRecordAdvance() - selectAdvanceOutcome() looks a row up by
 * index rather than encoding it into the onclick string.
 */

let pendingAdvanceTable = [];

/*
 * Staging for the Combat Calculator - a linear step-through
 * (your weapon -> opponent warband -> opponent fighter ->
 * opponent weapon -> results) rendered into one modal's body via
 * innerHTML swaps, same lightweight pattern as the Advance
 * picker's #advance-picker-body. combatCalculatorOpponentFighter
 * holds the profile/equipment fetched via the new
 * get_game_fighter_combat_profile RPC - never written anywhere,
 * just read for the duration of the calculator.
 */

let combatCalculatorFighterId = null;

let combatCalculatorMyWeaponId = null;

let combatCalculatorOpponentWarbandId = null;

let combatCalculatorOpponentFighter = null;

let combatCalculatorOpponentWeaponId = null;

/*
 * Only meaningful once "my weapon" turns out to be ranged - all
 * four are manual toggles since none of them are anything the app
 * tracks (line of sight, measured table distance, whether the
 * model moved, target size).
 */

let combatCalculatorShootingModifiers = {

    cover: false,

    longRange: false,

    movingAndShooting: false,

    largeTarget: false

};


/*
 * Only meaningful once "my weapon" turns out to be a one-handed
 * melee weapon - like the shooting modifiers above, this is a
 * manual toggle rather than something derived from the fighter's
 * owned equipment, since a fighter can only ever own one of any
 * given weapon id in this app's equipment model (a checkbox, not a
 * quantity), so it has no way to represent someone actually
 * carrying two of the same weapon (e.g. two Dwarf Axes).
 */

let combatCalculatorTwoWeapons = false;


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseFighter(
    fighter,
    index,
    warbandType
) {

    const typeId =
        fighter.type ||
        fighter.fighterType ||
        fighter.typeId;


    const definition =
        state.warbandDefinitions[
            warbandType || "reikland"
        ];


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === typeId
        );


    const profile =
        fighter.profile ||
        fighter.stats ||
        fighter.characteristics ||
        fighterType?.profile ||
        {};


    return {

        id:
            fighter.id ||
            generateId("fighter"),


        type:
            typeId ||
            fighterType?.id ||
            "unknown",


        typeName:
            fighter.typeName ||
            fighterType?.name ||
            fighter.name ||
            `Fighter ${index + 1}`,


        category:
            fighter.category ||
            fighterType?.category ||
            "henchman",


        name:
            fighter.name ||
            `${fighterType?.name || "Fighter"} ${index + 1}`,


        profile: {

            M: profile.M ?? "-",

            WS: profile.WS ?? "-",

            BS: profile.BS ?? "-",

            S: profile.S ?? "-",

            T: profile.T ?? "-",

            W: profile.W ?? "-",

            I: profile.I ?? "-",

            A: profile.A ?? "-",

            Ld: profile.Ld ?? "-"

        },


        baseCost:
            fighter.baseCost ??
            fighter.cost ??
            fighterType?.cost ??
            0,


        equipment:
            Array.isArray(
                fighter.equipment
            )
                ? fighter.equipment
                : [],


        skills:
            Array.isArray(
                fighter.skills
            )
                ? fighter.skills
                : [],


        experience:
            Number(
                fighter.experience
            ) || 0,


        injuries:
            Array.isArray(
                fighter.injuries
            )
                ? fighter.injuries
                : [],


        advances:
            Array.isArray(
                fighter.advances
            )
                ? fighter.advances
                : [],


        status:
            fighter.status === "retired" ||
            fighter.status === "dead"
                ? fighter.status
                : "active",


        wounds:
            fighter.wounds &&
            typeof fighter.wounds === "object"
                ? fighter.wounds
                : {},


        spells:
            Array.isArray(
                fighter.spells
            )
                ? fighter.spells
                : [],


        mutations:
            Array.isArray(
                fighter.mutations
            )
                ? fighter.mutations
                : []

    };

}


/* ============================================================
   ADD FIGHTER MODAL
   ============================================================ */

function showAddFighter() {

    const warband = getCurrentWarband();

    if (!warband) {
        return;
    }

    const definition =
        state.warbandDefinitions[warband.type];

    if (!definition) {
        return;
    }

    const fighterTypes =
        definition.fighterTypes || [];

    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <h2>
                        Add Fighter
                    </h2>

                    <p>
                        ${escapeHtml(
                            definition.name || warband.type
                        )}
                    </p>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>

            <div class="mm-modal-body">

                <div class="mm-fighter-type-grid">

                    ${
                        fighterTypes.length

                        ?

                        fighterTypes
                            .map(
                                type =>
                                    renderFighterTypeOption(
                                        type,
                                        warband
                                    )
                            )
                            .join("")

                        :

                        `
                            <p class="mm-muted">
                                No fighter types are currently
                                available for this warband.
                            </p>
                        `
                    }

                </div>

            </div>

        </div>

    `);
}


/* ============================================================
   FIGHTER TYPE OPTION
   ============================================================ */

function renderFighterTypeOption(type, warband) {

    const currentCount =
        (warband.fighters || []).filter(
            fighter =>
                fighter.type === type.id
        ).length;


    const atMaximum =
        type.max !== null &&
        type.max !== undefined &&
        currentCount >= Number(type.max);


    const maximumWarbandSize =
        Number(
            state.warbandDefinitions[
                warband.type
            ]?.maximumWarbandSize
        ) || 999;


    const warbandFull =
        (warband.fighters || []).length >=
        maximumWarbandSize;


    const cannotAfford =
        (Number(type.cost) || 0) >
        (Number(warband.treasury) || 0);


    const disabled =
        atMaximum ||
        warbandFull ||
        cannotAfford;


    return `

        <button
            type="button"
            class="
                mm-fighter-type-option
                ${disabled ? "is-disabled" : ""}
            "
            ${disabled ? "disabled" : ""}
            onclick="addFighter('${escapeAttribute(type.id)}')"
        >

            <div>

                <span class="mm-badge">
                    ${escapeHtml(
                        type.category || ""
                    )}
                </span>

                <h3>
                    ${escapeHtml(
                        type.name || "Unknown Fighter"
                    )}
                </h3>

            </div>


            <div class="mm-fighter-type-details">

                <span>
                    ${Number(type.cost) || 0} gc
                </span>

                <span>

                    ${currentCount}

                    /

                    ${
                        type.max === null ||
                        type.max === undefined
                            ? "∞"
                            : type.max
                    }

                </span>

            </div>

        </button>

    `;

}


/* ============================================================
   ADD FIGHTER
   ============================================================ */

async function addFighter(typeId) {

    const currentWarband =
        getCurrentWarband();


    if (!currentWarband) {

        console.error(
            "No current warband."
        );

        return;

    }


    const definition =
        state.warbandDefinitions[
            currentWarband.type
        ];


    if (!definition) {

        console.error(
            "No warband definition for:",
            currentWarband.type
        );

        return;

    }


    const fighterType =
        (definition.fighterTypes || [])
            .find(
                type =>
                    type.id === typeId
            );


    if (!fighterType) {

        console.error(
            "Fighter type not found:",
            typeId
        );

        alert(
            `Fighter type "${typeId}" not found.`
        );

        return;

    }


    /* --------------------------------------------------------
       CHECK TYPE LIMIT
       -------------------------------------------------------- */

    const existing =
        (currentWarband.fighters || [])
            .filter(
                fighter =>
                    fighter.type === fighterType.id
            )
            .length;


    if (
        fighterType.max !== null &&
        fighterType.max !== undefined &&
        existing >= Number(fighterType.max)
    ) {

        alert(
            `You cannot have more than ${fighterType.max} ${fighterType.name}(s).`
        );

        return;

    }


    /* --------------------------------------------------------
       CHECK TOTAL WARBAND SIZE
       -------------------------------------------------------- */

    const maximumSize =
        Number(
            definition.maximumWarbandSize
        ) || 999;


    if (
        currentWarband.fighters.length >=
        maximumSize
    ) {

        alert(
            `This warband cannot contain more than ${maximumSize} fighters.`
        );

        return;

    }


    /* --------------------------------------------------------
       CHECK TREASURY
       -------------------------------------------------------- */

    const recruitCost =
        Number(fighterType.cost) || 0;


    const treasury =
        Number(currentWarband.treasury) || 0;


    if (recruitCost > treasury) {

        alert(
            `Recruiting a ${fighterType.name} costs ${recruitCost} gc, ` +
            `but this warband only has ${treasury} gc.`
        );

        return;

    }


    /* --------------------------------------------------------
       CREATE FIGHTER
       -------------------------------------------------------- */

    const newTreasury =
        treasury - recruitCost;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("fighters")
            .insert({

                warband_id:
                    currentWarband.id,

                type:
                    fighterType.id,

                type_name:
                    fighterType.name,

                category:
                    fighterType.category || "henchman",

                name:
                    generateDefaultFighterName(
                        fighterType,
                        currentWarband
                    ),

                profile: {
                    ...(fighterType.profile || {})
                },

                base_cost:
                    recruitCost,

                equipment: [],

                skills: [],

                experience:
                    Number(
                        fighterType.startingExperience
                    ) || 0,

                advances: [],

                injuries: []

            })
            .select(`
                id,
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
            `)
            .single();


    if (error) {

        alert(
            "Unable to add fighter: " +
            error.message
        );

        return;

    }


    const {
        error: treasuryError
    } =
        await supabaseClient
            .from("warbands")
            .update({
                treasury:
                    newTreasury
            })
            .eq(
                "id",
                currentWarband.id
            );


    if (treasuryError) {

        console.error(
            "Fighter was added but treasury could not be updated:",
            treasuryError.message
        );

    }


    const fighter =
        normaliseFighter(
            data,
            currentWarband.fighters.length,
            currentWarband.type
        );


    currentWarband.fighters.push(
        fighter
    );


    currentWarband.treasury =
        newTreasury;


    closeModal();

    renderApplication();


    /* --------------------------------------------------------
       OPEN EDITOR
       -------------------------------------------------------- */

    setTimeout(
        () => {
            showEditFighter(
                fighter.id
            );
        },
        50
    );

}


/* ============================================================
   RENDER FIGHTERS
   ============================================================ */

function renderFighters(warband) {

    if (!warband.fighters.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    ⚔
                </div>

                <h3>
                    No fighters
                </h3>

                <p>
                    Add your Captain to begin
                    building your warband.
                </p>

            </div>

        `;

    }


    const activeFighters =
        warband.fighters.filter(
            fighter =>
                fighter.status === "active"
        );

    const retiredFighters =
        warband.fighters.filter(
            fighter =>
                fighter.status === "retired"
        );

    const deadFighters =
        warband.fighters.filter(
            fighter =>
                fighter.status === "dead"
        );


    const activeSection =
        activeFighters.length
            ? renderFighterCategoryGroups(
                activeFighters
            )
            : `
                <p class="mm-muted">
                    No active fighters.
                </p>
            `;


    return `

        ${activeSection}

        ${renderFighterStatusToggle(
            "showRetiredFighters",
            "Retired",
            retiredFighters,
            "toggleShowRetiredFighters"
        )}

        ${renderFighterStatusToggle(
            "showDeadFighters",
            "Dead",
            deadFighters,
            "toggleShowDeadFighters"
        )}

    `;

}


/*
 * Heroes/Henchmen grouping, shared between the active list here
 * and either "Show Retired/Dead Fighters" panel below - dead and
 * retired fighters still deserve the same grouping, not a flat
 * dump, so this is the same split renderFighters always used,
 * just reusable now.
 */

function renderFighterCategoryGroups(
    fighters
) {

    const heroes =
        fighters.filter(
            fighter =>
                fighter.category ===
                "hero"
        );


    const henchmen =
        fighters.filter(
            fighter =>
                fighter.category ===
                "henchman"
        );


    return `

        ${
            heroes.length
                ? `

                    <div class="mm-fighter-group">

                        <h3>
                            Heroes
                        </h3>

                        <div class="mm-fighter-list">

                            ${heroes
                                .map(
                                    renderFighter
                                )
                                .join("")}

                        </div>

                    </div>

                `
                : ""
        }


        ${
            henchmen.length
                ? `

                    <div class="mm-fighter-group">

                        <h3>
                            Henchmen
                        </h3>

                        <div class="mm-fighter-list">

                            ${henchmen
                                .map(
                                    renderFighter
                                )
                                .join("")}

                        </div>

                    </div>

                `
                : ""
        }

    `;

}


/*
 * Same "Show/Hide X (N)" toggle-and-reveal pattern already used
 * for retired warbands (warbands.js's renderWarbandCards) - two
 * independent instances here since dead and retired are separate
 * things worth filtering separately.
 */

function renderFighterStatusToggle(
    stateKey,
    label,
    fighters,
    toggleFunctionName
) {

    if (!fighters.length) {

        return "";

    }


    return `

        <div class="mm-retired-toggle">

            <button
                class="mm-button mm-button-small"
                onclick="${toggleFunctionName}()"
            >
                ${state[stateKey] ? "Hide" : "Show"}
                ${escapeHtml(label)} Fighters
                (${fighters.length})
            </button>

        </div>


        ${
            state[stateKey]
                ? renderFighterCategoryGroups(fighters)
                : ""
        }

    `;

}


function toggleShowRetiredFighters() {

    state.showRetiredFighters =
        !state.showRetiredFighters;


    renderApplication();

}


function toggleShowDeadFighters() {

    state.showDeadFighters =
        !state.showDeadFighters;


    renderApplication();

}


/* ============================================================
   RENDER SINGLE FIGHTER
   ============================================================ */

function renderFighter(fighter) {

    const profile =
        RulesEngine.calculateEffectiveProfile(
            fighter
        );


    const equipment =
        Array.isArray(
            fighter.equipment
        )
            ? fighter.equipment
            : [];


    return `

        <article class="mm-fighter-card">

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>

                    ${
                        fighter.status !== "active"
                            ? `
                                <span class="mm-badge mm-badge-${
                                    fighter.status === "dead"
                                        ? "danger"
                                        : "muted"
                                }">
                                    ${fighter.status === "dead" ? "Dead" : "Retired"}
                                </span>
                            `
                            : ""
                    }


                    <button
                        type="button"
                        class="mm-fighter-name-button"
                        onclick="showFighterDetails('${escapeAttribute(fighter.id)}')"
                    >
                        <h3>
                            ${escapeHtml(fighter.name)}
                        </h3>
                    </button>


                    <span class="mm-fighter-type">
                        ${escapeHtml(
                            fighter.typeName
                        )}
                    </span>

                </div>


                <div class="mm-profile">

                    ${renderStat(
                        "M",
                        profile.M
                    )}

                    ${renderStat(
                        "WS",
                        profile.WS
                    )}

                    ${renderStat(
                        "BS",
                        profile.BS
                    )}

                    ${renderStat(
                        "S",
                        profile.S
                    )}

                    ${renderStat(
                        "T",
                        profile.T
                    )}

                    ${renderStat(
                        "W",
                        profile.W
                    )}

                    ${renderStat(
                        "I",
                        profile.I
                    )}

                    ${renderStat(
                        "A",
                        profile.A
                    )}

                    ${renderStat(
                        "Ld",
                        profile.Ld
                    )}

                </div>

            </div>


            <div class="mm-fighter-equipment">

                <strong>
                    Equipment
                </strong>


                <div class="mm-equipment-tags">

                    ${
                        equipment.length

                            ? equipment
                                .map(
                                    renderEquipmentTag
                                )
                                .join("")

                            : `

                                <span class="mm-muted">
                                    None
                                </span>

                            `
                    }

                </div>

            </div>


            <p class="mm-muted mm-fighter-game-summary">
                ${fighter.injuries.length}
                injur${fighter.injuries.length === 1 ? "y" : "ies"}
                &middot;
                ${fighter.experience || 0} XP
                ${
                    fighter.category === "hero" &&
                    fighter.skills.length
                        ? ` &middot; ${fighter.skills.length} skill${fighter.skills.length === 1 ? "" : "s"}`
                        : ""
                }
                - recorded from the games this warband plays in.
            </p>


            <div class="mm-fighter-footer">

                <span>

                    ${calculateFighterCost(
                        fighter
                    )} gc

                </span>


                <div>

                    ${
                        fighter.status === "dead"
                            ? ""
                            : fighter.status === "retired"
                                ? `
                                    <button
                                        class="mm-button mm-button-small mm-button-primary"
                                        onclick="recoverFighter('${escapeAttribute(fighter.id)}')"
                                    >
                                        Recover
                                    </button>

                                    <button
                                        class="
                                            mm-button
                                            mm-button-small
                                            mm-button-danger
                                        "
                                        onclick="deleteFighter('${escapeAttribute(fighter.id)}')"
                                    >
                                        Remove
                                    </button>
                                `
                                : `
                                    <button
                                        class="mm-button mm-button-small"
                                        onclick="showEditFighter('${escapeAttribute(fighter.id)}')"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        class="mm-button mm-button-small"
                                        onclick="retireFighter('${escapeAttribute(fighter.id)}')"
                                    >
                                        Retire
                                    </button>
                                `
                    }

                </div>

            </div>

        </article>

    `;

}


/* ============================================================
   FIGHTER CARD - VIEWED FROM A GAME
   ============================================================ */

function renderFighterGameCard(
    fighter,
    readOnly
) {

    const isHero =
        fighter.category === "hero";


    return `

        <article class="mm-fighter-card">

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>


                    <h3>
                        ${escapeHtml(fighter.name)}
                    </h3>


                    <span class="mm-fighter-type">
                        ${escapeHtml(
                            fighter.typeName
                        )}
                    </span>

                </div>

            </div>


            <div class="mm-fighter-equipment">

                <strong>
                    Injuries
                </strong>

                <div class="mm-equipment-tags">

                    ${
                        fighter.injuries.length
                            ? fighter.injuries
                                .map(
                                    injury =>
                                        typeof injury === "string"
                                            ? renderInjuryTag(injury)
                                            : renderInjuryTag(
                                                injury.id,
                                                injury.name
                                            )
                                )
                                .join("")
                            : `<span class="mm-muted">None recorded</span>`
                    }

                </div>

            </div>


            ${
                isHero
                    ? `
                        <div class="mm-fighter-equipment">

                            <strong>
                                Skills
                            </strong>

                            <div class="mm-equipment-tags">

                                ${
                                    fighter.skills.length
                                        ? fighter.skills
                                            .map(
                                                skill =>
                                                    renderSkillTag(
                                                        typeof skill === "string"
                                                            ? skill
                                                            : skill.id
                                                    )
                                            )
                                            .join("")
                                        : `<span class="mm-muted">None recorded</span>`
                                }

                            </div>

                        </div>
                    `
                    : ""
            }


            <div class="mm-fighter-footer">

                <span>
                    ${fighter.experience || 0} XP

                    ${
                        !readOnly &&
                        RulesEngine.isEligibleForAdvance(
                            fighter,
                            state.advances
                        )
                            ? `
                                <span class="mm-badge mm-badge-highlight">
                                    Advance available
                                </span>
                            `
                            : ""
                    }
                </span>


                ${
                    readOnly
                        ? ""
                        : `
                            <div>

                                <button
                                    class="mm-button mm-button-small"
                                    onclick="showCombatCalculator('${escapeAttribute(fighter.id)}')"
                                >
                                    Combat Calculator
                                </button>

                                <button
                                    class="mm-button mm-button-small mm-button-primary"
                                    onclick="showFighterGameUpdate('${escapeAttribute(fighter.id)}')"
                                >
                                    Record Game Outcome
                                </button>

                            </div>
                        `
                }

            </div>

        </article>

    `;

}


/* ============================================================
   PROFILE STAT
   ============================================================ */

function renderStat(
    name,
    value
) {

    return `

        <div class="mm-stat">

            <span>
                ${escapeHtml(name)}
            </span>

            <strong>
                ${escapeHtml(value)}
            </strong>

        </div>

    `;

}


/* ============================================================
   EDIT FIGHTER
   ============================================================ */

function showEditFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    const fighter =
        warband?.fighters.find(
            item =>
                item.id ===
                fighterId
        );


    if (!fighter) {

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id ===
                fighter.type
        );


    if (!fighterType) {

        return;

    }


    const isFreshFighterEdit =
        editFighterId !== fighterId;


    editFighterId =
        fighterId;


    if (isFreshFighterEdit) {

        editingFighterSpells =
            [...(fighter.spells || [])];

        editingFighterMutations =
            [...(fighter.mutations || [])];

    }


    const availableEquipment =
        getAvailableEquipment(
            fighterType,
            warband.type
        );


    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>


                    <h2>
                        ${escapeHtml(
                            fighter.name
                        )}
                    </h2>

                </div>


                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">


                <label class="mm-field">

                    <span>
                        Name
                    </span>


                    <input
                        id="edit-fighter-name"
                        type="text"
                        value="${escapeAttribute(
                            fighter.name
                        )}"
                    >

                </label>


                <section class="mm-editor-section">

                    <h3>
                        Profile
                    </h3>


                    <p class="mm-muted">

                        Starting characteristics are
                        defined by the warband rules.
                        Advances and injuries will modify
                        these values through the campaign
                        system.

                    </p>


                    <div class="mm-profile-editor">

                        ${Object.entries(
                            RulesEngine.calculateEffectiveProfile(
                                fighter
                            )
                        )
                            .map(
                                ([stat, value]) =>
                                    renderReadOnlyStat(
                                        stat,
                                        value
                                    )
                            )
                            .join("")}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <div class="mm-section-header">

                        <div>

                            <h3>
                                Equipment
                            </h3>

                            <p>
                                Select equipment
                                available to this fighter.
                            </p>

                        </div>

                    </div>


                    <div id="fighter-equipment-validation"></div>


                    <div class="mm-equipment-selection">

                        ${availableEquipment
                            .map(
                                item =>
                                    renderEquipmentCheckbox(
                                        fighter,
                                        item,
                                        warband.stash.includes(
                                            item.id
                                        )
                                    )
                            )
                            .join("")}

                    </div>

                </section>


                ${
                    fighterType.wizard
                        ? renderFighterSpellsSection(
                            fighter,
                            fighterType
                        )
                        : ""
                }


                ${
                    fighterType.startsWithMutations ||
                    editingFighterMutations.length
                        ? renderFighterMutationsSection(
                            fighter,
                            fighterType
                        )
                        : ""
                }


                <section class="mm-editor-section">

                    <h3>
                        Injuries, Experience &amp; Skills
                    </h3>

                    <p>
                        These are recorded from the games
                        this warband plays in - open this
                        warband from a game to update them.
                    </p>


                    <div class="mm-detail-grid">

                        <div class="mm-rule-stat">
                            <span>
                                Injuries
                            </span>
                            <strong>
                                ${fighter.injuries.length}
                            </strong>
                        </div>

                        <div class="mm-rule-stat">
                            <span>
                                Experience
                            </span>
                            <strong>
                                ${fighter.experience || 0}
                            </strong>
                        </div>

                        ${
                            fighter.category === "hero"
                                ? `
                                    <div class="mm-rule-stat">
                                        <span>
                                            Skills
                                        </span>
                                        <strong>
                                            ${fighter.skills.length}
                                        </strong>
                                    </div>
                                `
                                : ""
                        }

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Fighter Cost
                    </h3>


                    <div id="fighter-cost-breakdown">

                        ${renderFighterCostBreakdown(
                            fighter,
                            fighter.equipment,
                            editingFighterMutations
                        )}

                    </div>

                </section>


            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="saveFighterChanges('${escapeAttribute(fighter.id)}')"
                >
                    Save Fighter
                </button>

            </div>

        </div>

    `);


    setupFighterEquipmentValidation(
        fighter,
        definition
    );

}


/* ============================================================
   FIGHTER SPELLS (roster editor only - learning a spell is a
   roster change, not a battle event, same reasoning as equipment)
   ============================================================ */

function renderFighterSpellsSection(
    fighter,
    fighterType
) {

    const wizardType =
        fighterType.wizard;


    const spellList =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.getSpellList === "function"
            ? RulesEngine.getSpellList(
                wizardType,
                state.magic
            )
            : [];


    const known =
        editingFighterSpells;


    const availableToLearn =
        spellList.filter(
            spell =>
                !known.includes(spell.roll)
        );


    return `

        <section class="mm-editor-section">

            <div class="mm-section-header">

                <div>

                    <h3>
                        Spells
                    </h3>

                    <p>
                        A wizard starts with one randomly
                        determined spell and gains more through
                        play - record whichever the table says
                        you rolled.
                    </p>

                </div>

            </div>


            ${
                known.length
                    ? `
                        <ul class="mm-injury-list">

                            ${known
                                .map(
                                    roll => {

                                        const spell =
                                            spellList.find(
                                                item =>
                                                    item.roll === roll
                                            );


                                        return `

                                            <li>

                                                <span>

                                                    <strong>
                                                        <button
                                                            type="button"
                                                            class="mm-link-button"
                                                            onclick="showFighterSpellDetail('${escapeAttribute(wizardType)}', ${roll})"
                                                        >
                                                            ${escapeHtml(
                                                                spell?.name ||
                                                                ("Roll " + roll)
                                                            )}
                                                        </button>
                                                    </strong>

                                                    ${
                                                        spell
                                                            ? `
                                                                <small>
                                                                    Roll ${spell.roll} · Difficulty ${spell.difficulty}+
                                                                </small>
                                                            `
                                                            : ""
                                                    }

                                                </span>

                                                <button
                                                    type="button"
                                                    class="mm-button mm-button-small mm-button-danger"
                                                    onclick="removeFighterSpell('${escapeAttribute(fighter.id)}', ${roll})"
                                                >
                                                    Remove
                                                </button>

                                            </li>

                                        `;

                                    }
                                )
                                .join("")}

                        </ul>
                    `
                    : `
                        <p class="mm-muted">
                            No spells known yet.
                        </p>
                    `
            }


            ${
                availableToLearn.length
                    ? `
                        <div class="mm-injury-add">

                            <select id="fighter-spell-picker">

                                ${availableToLearn
                                    .map(
                                        spell => `
                                            <option value="${spell.roll}">
                                                ${escapeHtml(
                                                    spell.roll + ". " + spell.name
                                                )} (Diff ${spell.difficulty}+)
                                            </option>
                                        `
                                    )
                                    .join("")}

                            </select>

                            <button
                                type="button"
                                class="mm-button"
                                onclick="
                                    addFighterSpell(
                                        '${escapeAttribute(fighter.id)}',
                                        Number(document.getElementById('fighter-spell-picker').value)
                                    )
                                "
                            >
                                Add Spell
                            </button>

                        </div>
                    `
                    : ""
            }

        </section>

    `;

}


function addFighterSpell(
    fighterId,
    roll
) {

    if (
        !roll ||
        editingFighterSpells.includes(roll)
    ) {

        return;

    }


    editingFighterSpells.push(roll);


    showEditFighter(fighterId);

}


function removeFighterSpell(
    fighterId,
    roll
) {

    editingFighterSpells =
        editingFighterSpells.filter(
            item =>
                item !== roll
        );


    showEditFighter(fighterId);

}


function showFighterSpellDetail(
    wizardType,
    roll
) {

    const spell =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.findSpell === "function"
            ? RulesEngine.findSpell(
                wizardType,
                roll,
                state.magic
            )
            : null;


    const canGoBack =
        modalCanGoBack();


    if (!spell) {

        pushModal(`

            <div class="mm-modal">

                <div class="mm-modal-header">

                    <div>

                        ${
                            canGoBack
                                ? `
                                    <button
                                        class="mm-back-button mm-modal-back"
                                        onclick="goBackModal()"
                                    >
                                        ← Back
                                    </button>
                                `
                                : ""
                        }

                        <h2>
                            Spell Not Found
                        </h2>

                    </div>

                    <button
                        class="mm-modal-close"
                        onclick="closeModal()"
                    >
                        ×
                    </button>

                </div>

                <div class="mm-modal-body">

                    <p class="mm-muted">
                        No detailed rules text is currently
                        available for this spell.
                    </p>

                </div>

            </div>

        `);

        return;

    }


    pushModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    ${
                        canGoBack
                            ? `
                                <button
                                    class="mm-back-button mm-modal-back"
                                    onclick="goBackModal()"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    <span class="mm-badge">
                        Difficulty ${spell.difficulty}+
                    </span>

                    <h2>
                        ${escapeHtml(spell.name)}
                    </h2>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>

            <div class="mm-modal-body">

                <div class="mm-rule-description">
                    ${formatRuleText(spell.effect)}
                </div>

                ${
                    spell.verified === false
                        ? `
                            <p class="mm-muted">
                                ⚠ This spell's exact wording could
                                not be fully verified against the
                                source PDF - double check it
                                against the rulebook before relying
                                on it at the table.
                            </p>
                        `
                        : ""
                }

                ${renderSourceInformation(
                    state.magic,
                    spell.sourcePage ||
                    state.magic?.[wizardType]?.sourcePage
                )}

            </div>

        </div>

    `);

}


/* ============================================================
   FIGHTER MUTATIONS (roster editor only - per the rules, only
   buyable at recruitment, never afterwards)
   ============================================================ */

function renderFighterMutationsSection(
    fighter,
    fighterType
) {

    const mutationList =
        state.mutations?.mutations || [];


    const owned =
        editingFighterMutations;


    return `

        <section class="mm-editor-section">

            <div class="mm-section-header">

                <div>

                    <h3>
                        Mutations
                    </h3>

                    <p>
                        Per the rules, mutations may only be
                        bought when this fighter is recruited -
                        never afterwards. The second and later
                        mutations on the same model cost double.
                    </p>

                </div>

            </div>


            ${
                owned.length
                    ? `
                        <ul class="mm-injury-list">

                            ${owned
                                .map(
                                    (mutationId, index) => {

                                        const mutation =
                                            mutationList.find(
                                                item =>
                                                    item.id === mutationId
                                            );


                                        const cost =
                                            (Number(mutation?.cost) || 0) *
                                            (index === 0 ? 1 : 2);


                                        return `

                                            <li>

                                                <span>

                                                    <strong>
                                                        <button
                                                            type="button"
                                                            class="mm-link-button"
                                                            onclick="showFighterMutationDetail('${escapeAttribute(mutationId)}')"
                                                        >
                                                            ${escapeHtml(
                                                                mutation?.name ||
                                                                mutationId
                                                            )}
                                                        </button>
                                                    </strong>

                                                    <small>
                                                        ${cost} gc
                                                    </small>

                                                </span>

                                                <button
                                                    type="button"
                                                    class="mm-button mm-button-small mm-button-danger"
                                                    onclick="removeFighterMutation('${escapeAttribute(fighter.id)}', ${index})"
                                                >
                                                    Remove
                                                </button>

                                            </li>

                                        `;

                                    }
                                )
                                .join("")}

                        </ul>
                    `
                    : `
                        <p class="mm-muted">
                            No mutations purchased yet.
                        </p>
                    `
            }


            ${
                mutationList.length
                    ? `
                        <div class="mm-injury-add">

                            <select id="fighter-mutation-picker">

                                ${mutationList
                                    .map(
                                        mutation => `
                                            <option value="${escapeAttribute(mutation.id)}">
                                                ${escapeHtml(
                                                    mutation.name
                                                )} (${mutation.cost} gc base)
                                            </option>
                                        `
                                    )
                                    .join("")}

                            </select>

                            <button
                                type="button"
                                class="mm-button"
                                onclick="
                                    addFighterMutation(
                                        '${escapeAttribute(fighter.id)}',
                                        document.getElementById('fighter-mutation-picker').value
                                    )
                                "
                            >
                                Add Mutation
                            </button>

                        </div>
                    `
                    : ""
            }

        </section>

    `;

}


function addFighterMutation(
    fighterId,
    mutationId
) {

    if (!mutationId) {

        return;

    }


    editingFighterMutations.push(mutationId);


    showEditFighter(fighterId);

}


function removeFighterMutation(
    fighterId,
    index
) {

    editingFighterMutations.splice(
        index,
        1
    );


    showEditFighter(fighterId);

}


function showFighterMutationDetail(
    mutationId
) {

    const mutation =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.findMutation === "function"
            ? RulesEngine.findMutation(
                mutationId,
                state.mutations
            )
            : null;


    const canGoBack =
        modalCanGoBack();


    if (!mutation) {

        pushModal(`

            <div class="mm-modal">

                <div class="mm-modal-header">

                    <div>

                        ${
                            canGoBack
                                ? `
                                    <button
                                        class="mm-back-button mm-modal-back"
                                        onclick="goBackModal()"
                                    >
                                        ← Back
                                    </button>
                                `
                                : ""
                        }

                        <h2>
                            Mutation Not Found
                        </h2>

                    </div>

                    <button
                        class="mm-modal-close"
                        onclick="closeModal()"
                    >
                        ×
                    </button>

                </div>

                <div class="mm-modal-body">

                    <p class="mm-muted">
                        No detailed rules text is currently
                        available for this mutation.
                    </p>

                </div>

            </div>

        `);

        return;

    }


    pushModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    ${
                        canGoBack
                            ? `
                                <button
                                    class="mm-back-button mm-modal-back"
                                    onclick="goBackModal()"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    <span class="mm-badge">
                        ${mutation.cost} gc base
                    </span>

                    <h2>
                        ${escapeHtml(mutation.name)}
                    </h2>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>

            <div class="mm-modal-body">

                <div class="mm-rule-description">
                    ${formatRuleText(mutation.effect)}
                </div>

                ${renderSourceInformation(
                    state.mutations,
                    mutation.sourcePage
                )}

            </div>

        </div>

    `);

}


/* ============================================================
   FIGHTER GAME UPDATE (INJURIES / EXPERIENCE / SKILLS)

   Reached only from a game this warband is playing in - see
   renderWarbandInGamePage(). Roster/equipment stays in
   showEditFighter above; this is strictly post-battle bookkeeping.
   ============================================================ */

function showFighterGameUpdate(
    fighterId
) {

    const warband =
        getCurrentWarband();


    const fighter =
        warband?.fighters.find(
            item =>
                item.id ===
                fighterId
        );


    if (!fighter) {

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id ===
                fighter.type
        );


    if (!fighterType) {

        return;

    }


    const game =
        state.games.find(
            item =>
                item.id === state.returnToGameId
        );


    const woundsState =
        game
            ? RulesEngine.getFighterWoundsState(
                fighter,
                game.id,
                game.scenario.round
            )
            : null;


    /*
     * Safe to call this again for the SAME fighter mid-session
     * (e.g. right after recording an advance) without losing
     * staged-but-unsaved changes - only re-seed from the real
     * fighter when this is a fresh open, or a different fighter.
     */

    const isFreshOpen =
        gameUpdateFighterId !== fighterId;


    gameUpdateFighterId =
        fighterId;


    if (isFreshOpen) {

        editingInjuries =
            [...fighter.injuries];

        editingSkills =
            [...fighter.skills];

        editingAdvances =
            [...fighter.advances];

        editingProfile =
            { ...fighter.profile };

        editingCategory =
            fighter.category;

    }


    const isHero =
        editingCategory === "hero";


    /*
     * Which skills this fighter is even eligible to learn -
     * henchmen never get skills (see the verified rulebook
     * text), and a Hero is restricted to the skill lists his
     * warband entry grants him. Shared with the "New Skill"
     * advance picker below, since a promotion can change this
     * mid-modal without a fresh call to showFighterGameUpdate.
     */

    refreshEditingSkillOptions();


    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            editingCategory
                        )}
                    </span>


                    <h2>
                        ${escapeHtml(
                            fighter.name
                        )}
                    </h2>

                </div>


                <button
                    class="mm-modal-close"
                    onclick="cancelFighterGameUpdate()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <section class="mm-editor-section">

                    <h3>
                        Profile
                    </h3>


                    <div
                        class="mm-profile-editor"
                        id="fighter-profile-grid"
                    >

                        ${renderFighterGameUpdateProfile()}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Wounds
                    </h3>


                    <div id="fighter-wounds-section">

                        ${renderWoundsSection(
                            fighter,
                            game
                        )}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Advance
                    </h3>


                    <div id="fighter-advance-section">

                        ${renderAdvanceSection(
                            fighter
                        )}

                    </div>

                </section>


                <section
                    class="mm-editor-section"
                    id="fighter-injuries-section"
                >

                    <h3>
                        Injuries
                    </h3>

                    <p
                        class="mm-muted"
                        id="fighter-injuries-intro"
                    >
                        ${renderInjuriesIntroText(
                            woundsState?.outOfAction === true,
                            isHero
                        )}
                    </p>


                    <div id="fighter-injuries-list">

                        ${renderInjuriesEditorList()}

                    </div>


                    ${
                        isHero
                            ? `
                                <div class="mm-injury-add">

                                    <select
                                        id="new-injury-select"
                                    >

                                        ${(state.injuries?.injuries || [])
                                            .map(
                                                injury => `
                                                    <option value="${escapeAttribute(injury.id)}">
                                                        ${escapeHtml(injury.name)}
                                                        (${escapeHtml(injury.rollRange)})
                                                    </option>
                                                `
                                            )
                                            .join("")}

                                    </select>

                                    <button
                                        type="button"
                                        class="mm-button"
                                        onclick="addInjuryToEditor()"
                                    >
                                        Add Injury
                                    </button>

                                </div>
                            `
                            : `
                                <div class="mm-picker-actions">

                                    <button
                                        type="button"
                                        class="mm-button mm-button-danger"
                                        onclick="recordHenchmanOutcome('removed')"
                                    >
                                        Removed from Roster
                                        (rolled ${escapeHtml(
                                            state.injuries?.henchmanOutOfAction?.removedRoll || "1-2"
                                        )})
                                    </button>

                                    <button
                                        type="button"
                                        class="mm-button"
                                        onclick="recordHenchmanOutcome('fine')"
                                    >
                                        Fine, Fights On
                                        (rolled ${escapeHtml(
                                            state.injuries?.henchmanOutOfAction?.fineRoll || "3-6"
                                        )})
                                    </button>

                                </div>
                            `
                    }

                </section>


                ${
                    isHero
                        ? `
                            <section class="mm-editor-section">

                                <h3>
                                    Skills
                                </h3>

                                <p>
                                    Skills are picked as part of
                                    recording a "New Skill" Advance
                                    result below - remove one here
                                    to undo a mistaken pick.
                                </p>


                                <div id="fighter-skills-list">

                                    ${renderSkillsEditorList()}

                                </div>

                            </section>
                        `
                        : ""
                }


                <section class="mm-editor-section">

                    <h3>
                        Experience
                    </h3>


                    <div class="mm-rule-stat">

                        <span>
                            Current Experience
                        </span>

                        <strong>
                            ${fighter.experience || 0} XP
                        </strong>

                    </div>


                    <label class="mm-field">

                        <span>
                            New Experience Total
                        </span>


                        <input
                            id="fighter-game-xp"
                            type="number"
                            min="0"
                            value="${fighter.experience || 0}"
                            data-original-xp="${fighter.experience || 0}"
                            oninput="updateFighterGameXpDelta()"
                        >

                    </label>


                    <p
                        class="mm-muted"
                        id="fighter-game-xp-delta"
                    ></p>

                </section>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="cancelFighterGameUpdate()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="saveFighterGameUpdate('${escapeAttribute(fighter.id)}')"
                >
                    Save
                </button>

            </div>

        </div>

    `);

}


function cancelFighterGameUpdate() {

    gameUpdateFighterId =
        null;


    closeModal();

}


function getGameUpdateFighter() {

    const warband =
        getCurrentWarband();


    return (
        warband?.fighters.find(
            item =>
                item.id === gameUpdateFighterId
        ) || null
    );

}


/*
 * Keeps the XP delta note in sync with whatever's typed into the
 * field (or pre-filled by the Combat Calculator's "Caused a
 * casualty" shortcut) - compares against the real saved value
 * (data-original-xp) rather than trusting anything already staged
 * in JS, since XP itself isn't tracked in an editingXxx array.
 */

function updateFighterGameXpDelta() {

    const input =
        document.getElementById(
            "fighter-game-xp"
        );

    const display =
        document.getElementById(
            "fighter-game-xp-delta"
        );


    if (
        !input ||
        !display
    ) {

        return;

    }


    const original =
        Number(input.dataset.originalXp) || 0;

    const current =
        Number(input.value) || 0;

    const delta =
        current - original;


    display.textContent =
        delta === 0
            ? ""
            : `${delta > 0 ? "+" : ""}${delta} XP proposed (from ${original})`;

}


/*
 * Recomputes editingSkillOptions from the CURRENT editingCategory/
 * editingAdvances, rather than what they were when the modal last
 * opened - a promotion changes both mid-modal (see
 * confirmPromoteToHero -> the immediate bonus Hero-table roll),
 * so the "New Skill" picker below always calls this itself right
 * before rendering.
 */

function refreshEditingSkillOptions() {

    const warband =
        getCurrentWarband();

    const fighter =
        getGameUpdateFighter();


    if (!warband || !fighter) {

        editingSkillOptions = [];

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];

    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        );


    const accessibleCategories =
        state.skills?.warbandAccess?.[warband.type]?.[fighterType?.id] ||
        editingAdvances.find(
            advance =>
                advance.type === "promote-to-hero"
        )?.skillCategories ||
        [];


    editingSkillOptions =
        editingCategory === "hero"
            ? (state.skills?.skills || []).filter(
                skill =>
                    accessibleCategories.includes(
                        skill.category
                    )
            )
            : [];

}


/* ============================================================
   FIGHTER GAME UPDATE - PROFILE (REFLECTS STAGED ADVANCES)
   ============================================================ */

function renderFighterGameUpdateProfile() {

    const effective =
        RulesEngine.calculateEffectiveProfile({
            profile: editingProfile,
            injuries: editingInjuries
        });


    return Object.entries(effective)
        .map(
            ([stat, value]) =>
                renderReadOnlyStat(
                    stat,
                    value
                )
        )
        .join("");

}


function refreshFighterGameUpdateProfile() {

    const grid =
        document.getElementById(
            "fighter-profile-grid"
        );


    if (grid) {

        grid.innerHTML =
            renderFighterGameUpdateProfile();

    }

}


/* ============================================================
   WOUNDS

   Unlike Injuries/Skills/Advances/XP below (staged, only written
   on this modal's own Save), a recorded wound is persisted the
   moment it happens - the same instant optimistic-update pattern
   as retireFighter/retireWarband - since this is a moment-to-
   moment "what's happening right now mid-battle" action that
   needs to survive a closed browser before the battle report is
   finished, not an end-of-battle summary. getFighterWoundsState
   (js/rules.js) is what decides whether a stored value is for the
   CURRENT battle (that game's scenario_round) or a stale one from
   a previous scenario, resetting to full in the latter case.
   ============================================================ */

function refreshWoundsSection(
    fighter,
    game
) {

    const section =
        document.getElementById(
            "fighter-wounds-section"
        );


    if (section) {

        section.innerHTML =
            renderWoundsSection(
                fighter,
                game
            );

    }

}


function renderWoundsSection(
    fighter,
    game
) {

    if (!game) {

        return `
            <p class="mm-muted">
                This warband isn't currently in a
                game, so there's no battle to
                track Wounds for.
            </p>
        `;

    }


    const wounds =
        RulesEngine.getFighterWoundsState(
            fighter,
            game.id,
            game.scenario.round
        );


    if (wounds.outOfAction) {

        return `

            <div class="mm-rule-stat">
                <span>
                    Wounds
                </span>
                <strong>
                    0 / ${wounds.max}
                </strong>
            </div>

            <p class="mm-muted">
                Out of Action this battle - see
                Injuries below.
            </p>

        `;

    }


    return `

        <div class="mm-rule-stat">
            <span>
                Wounds
            </span>
            <strong>
                ${wounds.remaining} / ${wounds.max}
            </strong>
        </div>

        <button
            type="button"
            class="mm-button"
            onclick="recordFighterWound('${escapeAttribute(fighter.id)}')"
        >
            Record a Wound
        </button>

    `;

}


async function recordFighterWound(
    fighterId
) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item =>
                item.id === fighterId
        );

    const game =
        state.games.find(
            item =>
                item.id === state.returnToGameId
        );


    if (
        !fighter ||
        !game
    ) {

        return;

    }


    const previous =
        RulesEngine.getFighterWoundsState(
            fighter,
            game.id,
            game.scenario.round
        );


    const nextRemaining =
        Math.max(
            0,
            previous.remaining - 1
        );


    await persistFighterWounds(
        fighter,
        game,
        {
            remaining:
                nextRemaining,

            round:
                game.scenario.round,

            outOfAction:
                false
        }
    );


    if (nextRemaining > 0) {

        refreshWoundsSection(
            fighter,
            game
        );

        return;

    }


    /*
     * Wounds just hit zero - record what actually happened at the
     * table rather than rolling it ourselves (the verified 1-2
     * Knocked Down / 3-4 Stunned / 5-6 Out of Action chart already
     * lives in combat.json, shown elsewhere as reference text -
     * this is the one place it becomes something recorded).
     */

    const section =
        document.getElementById(
            "fighter-wounds-section"
        );


    if (section) {

        section.innerHTML = `

            <div class="mm-rule-stat">
                <span>
                    Wounds
                </span>
                <strong>
                    0 / ${previous.max}
                </strong>
            </div>

            <p class="mm-muted">
                What happened when Wounds
                reached zero?
            </p>

            <div class="mm-warband-select-list">

                ${(state.combat?.outOfActionChart || [])
                    .map(
                        (row, index) => `
                            <button
                                type="button"
                                class="mm-warband-select-option"
                                onclick="selectOutOfActionResult('${escapeAttribute(fighter.id)}', ${index})"
                            >
                                <strong>
                                    ${escapeHtml(row.label)}
                                </strong>

                                <span>
                                    Roll ${escapeHtml(row.roll)}
                                </span>
                            </button>
                        `
                    )
                    .join("")}

            </div>

        `;

    }

}


async function selectOutOfActionResult(
    fighterId,
    index
) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item =>
                item.id === fighterId
        );

    const game =
        state.games.find(
            item =>
                item.id === state.returnToGameId
        );

    const row =
        (state.combat?.outOfActionChart || [])[index];


    if (
        !fighter ||
        !game ||
        !row
    ) {

        return;

    }


    /*
     * Knocked Down / Stunned are purely transient - the fighter
     * gets back up before the post-battle report matters, so
     * nothing further needs recording. Only Out of Action persists
     * a flag, which is what unlocks the Injuries prompt below.
     */

    const isOutOfAction =
        row.label === "Out of Action";


    await persistFighterWounds(
        fighter,
        game,
        {
            remaining:
                0,

            round:
                game.scenario.round,

            outOfAction:
                isOutOfAction
        }
    );


    refreshWoundsSection(
        fighter,
        game
    );


    const injuriesIntro =
        document.getElementById(
            "fighter-injuries-intro"
        );


    if (injuriesIntro) {

        injuriesIntro.textContent =
            renderInjuriesIntroText(
                isOutOfAction,
                editingCategory === "hero"
            );

    }


    if (isOutOfAction) {

        const injuriesSection =
            document.getElementById(
                "fighter-injuries-section"
            );


        if (injuriesSection) {

            injuriesSection.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });

        }

    }

}


async function persistFighterWounds(
    fighter,
    game,
    entry
) {

    const previousWounds =
        fighter.wounds;


    fighter.wounds = {

        ...fighter.wounds,

        [game.id]:
            entry

    };


    const { error } =
        await supabaseClient
            .from("fighters")
            .update({
                wounds: fighter.wounds
            })
            .eq(
                "id",
                fighter.id
            );


    if (error) {

        alert(
            "Unable to record wound: " +
            error.message
        );

        fighter.wounds =
            previousWounds;

    }

}


/* ============================================================
   ADVANCE SECTION (ELIGIBILITY)
   ============================================================ */

function renderAdvanceSection(
    fighter
) {

    const stagedFighter = {

        category:
            editingCategory,

        experience:
            fighter.experience,

        advances:
            editingAdvances

    };


    const threshold =
        RulesEngine.getNextAdvanceThreshold(
            stagedFighter,
            state.advances
        );


    if (threshold === null) {

        return `

            <p class="mm-muted">
                No further advances are
                defined for this fighter.
            </p>

        `;

    }


    const eligible =
        RulesEngine.isEligibleForAdvance(
            stagedFighter,
            state.advances
        );


    return `

        <div class="mm-rule-stat">

            <span>
                Next Advance At
            </span>

            <strong>
                ${threshold} XP
            </strong>

        </div>

        ${
            eligible
                ? `
                    <button
                        type="button"
                        class="mm-button mm-button-primary"
                        onclick="showRecordAdvance('${escapeAttribute(fighter.id)}')"
                    >
                        Record Advance
                    </button>
                `
                : `
                    <p class="mm-muted">
                        ${fighter.experience || 0} / ${threshold} XP
                        towards the next advance.
                    </p>
                `
        }

    `;

}


function refreshAdvanceSection() {

    const fighter =
        getGameUpdateFighter();


    if (!fighter) {

        return;

    }


    const section =
        document.getElementById(
            "fighter-advance-section"
        );


    if (section) {

        section.innerHTML =
            renderAdvanceSection(
                fighter
            );

    }

}


/* ============================================================
   RECORD ADVANCE

   A drill-down from the fighter game-update modal - lets the
   player pick which of the (real, table-rolled) outcomes their
   fighter got, then applies it. Rows sharing an identical
   outcome (both "New Skill" results on the Hero table) are only
   shown once.
   ============================================================ */

/*
 * Rows sharing an identical outcome (both "New Skill" results on
 * the Hero table) are only shown once.
 */

function buildDedupedAdvanceTable(
    category
) {

    const fullTable =
        RulesEngine.getAdvanceTable(
            { category },
            state.advances
        );


    const seen =
        new Set();

    return fullTable.filter(
        row => {

            const key =
                row.result + "|" + row.label;


            if (seen.has(key)) {

                return false;

            }


            seen.add(key);

            return true;

        }
    );

}


function showRecordAdvance(
    fighterId
) {

    const fighter =
        getGameUpdateFighter();


    if (!fighter || fighter.id !== fighterId) {

        return;

    }


    pendingAdvanceTable =
        buildDedupedAdvanceTable(
            editingCategory
        );


    const canGoBack =
        modalCanGoBack();


    pushModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    ${
                        canGoBack
                            ? `
                                <button
                                    class="mm-back-button mm-modal-back"
                                    onclick="goBackModal()"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    <h2>
                        Record Advance
                    </h2>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="goBackModal()"
                >
                    ×
                </button>

            </div>


            <div
                class="mm-modal-body"
                id="advance-picker-body"
            >

                ${renderAdvanceOutcomeList(
                    fighter
                )}

            </div>

        </div>

    `);

}


function renderAdvanceOutcomeList(
    fighter
) {

    /*
     * A Henchman can never add more than +1 to the same
     * characteristic (rulebook p83) - a single-stat row (not a
     * choice between two) is disabled outright once used, rather
     * than letting the click through only to dead-end.
     */

    const usedStats =
        editingCategory === "henchman"
            ? editingAdvances
                .filter(
                    advance =>
                        advance.type === "characteristic"
                )
                .map(
                    advance =>
                        advance.stat
                )
            : [];


    return `

        <p class="mm-muted">
            What did ${escapeHtml(fighter.name)}
            roll on the Advance table?
        </p>


        <div class="mm-warband-select-list">

            ${pendingAdvanceTable
                .map(
                    (row, index) => {

                        const alreadyUsed =
                            row.result === "characteristic" &&
                            usedStats.includes(row.stat);


                        return `
                            <button
                                type="button"
                                class="mm-warband-select-option"
                                onclick="selectAdvanceOutcome(${index})"
                                ${alreadyUsed ? "disabled" : ""}
                            >
                                <strong>
                                    ${escapeHtml(row.label)}
                                </strong>

                                <span>
                                    ${
                                        alreadyUsed
                                            ? "Already increased"
                                            : `Roll ${escapeHtml(row.roll)}`
                                    }
                                </span>
                            </button>
                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


function selectAdvanceOutcome(
    index
) {

    const row =
        pendingAdvanceTable[index];


    if (!row) {

        return;

    }


    if (row.result === "characteristic") {

        applyCharacteristicAdvance(
            row.stat
        );

        return;

    }


    if (row.result === "characteristic-choice") {

        renderCharacteristicChoicePicker(
            row
        );

        return;

    }


    if (row.result === "new-skill") {

        applyNewSkillAdvance();

        return;

    }


    if (row.result === "promote-to-hero") {

        renderPromoteToHeroPicker();

        return;

    }

}


function renderCharacteristicChoicePicker(
    row
) {

    const body =
        document.getElementById(
            "advance-picker-body"
        );


    if (!body) {

        return;

    }


    /*
     * "Henchmen never add more than +1 point to any of their
     * initial characteristics" (rulebook p83) - a Hero has no
     * such restriction (only racial maximums, which this app
     * doesn't model), so this guard only applies pre-promotion.
     */

    const usedStats =
        editingCategory === "henchman"
            ? editingAdvances
                .filter(
                    advance =>
                        advance.type === "characteristic"
                )
                .map(
                    advance =>
                        advance.stat
                )
            : [];


    body.innerHTML = `

        <p class="mm-muted">
            ${escapeHtml(row.label)} -
            which one?
        </p>


        <div class="mm-warband-select-list">

            ${row.options
                .map(
                    stat => {

                        const alreadyUsed =
                            usedStats.includes(stat);


                        return `
                            <button
                                type="button"
                                class="mm-warband-select-option"
                                onclick="applyCharacteristicAdvance('${escapeAttribute(stat)}')"
                                ${alreadyUsed ? "disabled" : ""}
                            >
                                <strong>
                                    +1 ${escapeHtml(
                                        getStatName(stat)
                                    )}
                                </strong>

                                ${
                                    alreadyUsed
                                        ? `
                                            <span>
                                                Already increased
                                            </span>
                                        `
                                        : ""
                                }
                            </button>
                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


function applyCharacteristicAdvance(
    stat
) {

    const fighter =
        getGameUpdateFighter();


    if (!fighter) {

        return;

    }


    editingProfile[stat] =
        (Number(editingProfile[stat]) || 0) + 1;


    editingAdvances.push({

        type:
            "characteristic",

        stat,

        xpAtAdvance:
            fighter.experience || 0,

        date:
            new Date().toISOString()

    });


    showFighterGameUpdate(
        fighter.id
    );

}


function applyNewSkillAdvance() {

    renderNewSkillPicker();

}


function renderNewSkillPicker() {

    const body =
        document.getElementById(
            "advance-picker-body"
        );


    if (!body) {

        return;

    }


    /*
     * Recompute rather than trust the module-level value - a
     * promotion earlier in THIS same drill-down (the immediate
     * bonus Hero-table roll) can change which categories this
     * fighter can pick from without a fresh showFighterGameUpdate
     * call in between.
     */

    refreshEditingSkillOptions();


    const available =
        editingSkillOptions.filter(
            skill =>
                !editingSkills.some(
                    existing =>
                        existing.id === skill.id
                )
        );


    body.innerHTML = `

        <p class="mm-muted">
            New Skill - which one was learned?
        </p>


        <div class="mm-warband-select-list">

            ${
                available.length
                    ? available
                        .map(
                            skill => `
                                <button
                                    type="button"
                                    class="mm-warband-select-option"
                                    onclick="confirmNewSkillChoice('${escapeAttribute(skill.id)}')"
                                >
                                    <strong>
                                        ${escapeHtml(skill.name)}
                                    </strong>

                                    <span>
                                        ${escapeHtml(skill.category)}
                                    </span>
                                </button>
                            `
                        )
                        .join("")
                    : `
                        <p class="mm-muted">
                            No further skills are available from
                            this fighter's accessible skill lists.
                        </p>
                    `
            }

        </div>

    `;

}


/*
 * A confirmation step between picking a skill and it actually
 * landing on the fighter - shows what the skill does (and its
 * rules source) so the choice is informed, rather than committing
 * the instant a name is clicked.
 */

function confirmNewSkillChoice(
    skillId
) {

    const body =
        document.getElementById(
            "advance-picker-body"
        );


    if (!body) {

        return;

    }


    const skill =
        getSkill(skillId);


    if (!skill) {

        return;

    }


    body.innerHTML = `

        <p class="mm-muted">
            Confirm this skill?
        </p>


        <div class="mm-skill-confirm">

            <span class="mm-badge">
                ${escapeHtml(skill.category)}
            </span>

            <h3>
                ${escapeHtml(skill.name)}
            </h3>

            <div class="mm-rule-description">
                ${formatRuleText(
                    skill.description ||
                    "No description available."
                )}
            </div>

            ${renderSourceInformation(
                state.skills,
                skill.sourcePage
            )}

        </div>


        <div class="mm-picker-actions">

            <button
                type="button"
                class="mm-button"
                onclick="renderNewSkillPicker()"
            >
                ← Choose a different skill
            </button>

            <button
                type="button"
                class="mm-button mm-button-primary"
                onclick="selectNewSkillAdvance('${escapeAttribute(skill.id)}')"
            >
                Confirm Skill
            </button>

        </div>

    `;

}


function selectNewSkillAdvance(
    skillId
) {

    const fighter =
        getGameUpdateFighter();


    if (!fighter) {

        return;

    }


    const skill =
        getSkill(skillId);


    if (!skill) {

        return;

    }


    editingSkills.push({

        id:
            skill.id,

        name:
            skill.name,

        category:
            skill.category,

        description:
            skill.description,

        date:
            new Date().toISOString()

    });


    editingAdvances.push({

        type:
            "new-skill",

        skillId:
            skill.id,

        skillName:
            skill.name,

        xpAtAdvance:
            fighter.experience || 0,

        date:
            new Date().toISOString()

    });


    showFighterGameUpdate(
        fighter.id
    );

}


/*
 * Working set of skill categories for the promote-to-hero picker
 * below - separate from editingSkillOptions/editingSkills, which
 * are about picking an actual skill, not a skill LIST.
 */

let pendingPromotionCategories = [];


function renderPromoteToHeroPicker() {

    const body =
        document.getElementById(
            "advance-picker-body"
        );


    if (!body) {

        return;

    }


    pendingPromotionCategories = [];


    const categories =
        state.skills?.skillCategories || [];


    body.innerHTML = `

        <p class="mm-muted">
            Promoted to Hero - pick exactly
            two skill lists this fighter can
            now choose skills from.
        </p>


        <div
            class="mm-warband-select-list"
            id="promotion-category-list"
        >

            ${categories
                .map(
                    category => `
                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="togglePromotionCategory('${escapeAttribute(category.id)}')"
                        >
                            <strong>
                                ${escapeHtml(category.name)}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    category.description || ""
                                )}
                            </span>
                        </button>
                    `
                )
                .join("")}

        </div>


        <button
            type="button"
            class="mm-button mm-button-primary"
            onclick="confirmPromoteToHero()"
            ${
                pendingPromotionCategories.length === 2
                    ? ""
                    : "disabled"
            }
        >
            Confirm Promotion
        </button>

    `;

}


function togglePromotionCategory(
    categoryId
) {

    const index =
        pendingPromotionCategories.indexOf(
            categoryId
        );


    if (index === -1) {

        if (pendingPromotionCategories.length >= 2) {

            return;

        }

        pendingPromotionCategories.push(
            categoryId
        );

    } else {

        pendingPromotionCategories.splice(
            index,
            1
        );

    }


    const list =
        document.getElementById(
            "promotion-category-list"
        );


    if (list) {

        Array.from(
            list.children
        ).forEach(
            (button, buttonIndex) => {

                const category =
                    (state.skills?.skillCategories || [])[
                        buttonIndex
                    ];


                if (!category) {

                    return;

                }


                button.classList.toggle(
                    "mm-warband-select-option-active",
                    pendingPromotionCategories.includes(
                        category.id
                    )
                );

            }
        );

    }


    const confirmButton =
        document.querySelector(
            "#advance-picker-body .mm-button-primary"
        );


    if (confirmButton) {

        confirmButton.disabled =
            pendingPromotionCategories.length !== 2;

    }

}


function confirmPromoteToHero() {

    const fighter =
        getGameUpdateFighter();


    if (
        !fighter ||
        pendingPromotionCategories.length !== 2
    ) {

        return;

    }


    editingCategory =
        "hero";


    editingAdvances.push({

        type:
            "promote-to-hero",

        skillCategories:
            [...pendingPromotionCategories],

        xpAtAdvance:
            fighter.experience || 0,

        date:
            new Date().toISOString()

    });


    /*
     * "He can immediately make one roll on the Heroes Advance
     * table" (rulebook p83) - a bonus roll, separate from and not
     * gated by the normal XP threshold, so it's chained straight
     * in rather than returning to the parent modal first.
     */

    renderPromotionBonusRoll();

}


function renderPromotionBonusRoll() {

    const fighter =
        getGameUpdateFighter();


    if (!fighter) {

        return;

    }


    const body =
        document.getElementById(
            "advance-picker-body"
        );


    if (!body) {

        return;

    }


    pendingAdvanceTable =
        buildDedupedAdvanceTable(
            editingCategory
        );


    body.innerHTML = `

        <p class="mm-muted">
            "The lad's got talent" - as a new Hero,
            ${escapeHtml(fighter.name)} immediately
            makes one roll on the Heroes Advance
            table. What did they roll?
        </p>


        <div class="mm-warband-select-list">

            ${pendingAdvanceTable
                .map(
                    (row, index) => `
                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="selectAdvanceOutcome(${index})"
                        >
                            <strong>
                                ${escapeHtml(row.label)}
                            </strong>

                            <span>
                                Roll ${escapeHtml(row.roll)}
                            </span>
                        </button>
                    `
                )
                .join("")}

        </div>

    `;

}


/* ============================================================
   COMBAT CALCULATOR

   A reference tool, not a simulator - works out the To Hit / To
   Wound / Armour Save numbers a physical dice roll would need,
   for a fighter against a real opponent in the same game. Nothing
   about the calculator itself is ever saved; only the eventual
   "record a wound" / "caused a casualty" shortcuts at the end
   write anything, and they do it through showFighterGameUpdate's
   own existing Save flow, never directly.
   ============================================================ */

function getCombatCalculatorFighter() {

    const warband =
        getCurrentWarband();


    return (
        warband?.fighters.find(
            item =>
                item.id === combatCalculatorFighterId
        ) || null
    );

}


/*
 * Looked up separately from the fighter record itself since only
 * the warband's definition knows whether this fighter type is a
 * wizard (and which spell list it draws from) - used to decide
 * whether the "Cast a Spell" reference shows up alongside the
 * weapon picker.
 */

function getCombatCalculatorFighterType() {

    const warband =
        getCurrentWarband();

    const fighter =
        getCombatCalculatorFighter();


    if (!warband || !fighter) {

        return null;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    return (
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        ) || null
    );

}


function getCombatCalculatorGame() {

    return (
        state.games.find(
            game =>
                game.id === state.returnToGameId
        ) || null
    );

}


function refreshCombatCalculatorBody(
    html
) {

    const body =
        document.getElementById(
            "combat-calc-body"
        );


    if (body) {

        body.innerHTML =
            html;

    }

}


function closeCombatCalculator() {

    combatCalculatorFighterId = null;

    combatCalculatorMyWeaponId = null;

    combatCalculatorOpponentWarbandId = null;

    combatCalculatorOpponentFighter = null;

    combatCalculatorOpponentWeaponId = null;

    combatCalculatorShootingModifiers = {
        cover: false,
        longRange: false,
        movingAndShooting: false,
        largeTarget: false
    };

    combatCalculatorTwoWeapons = false;


    closeModal();

}


function showCombatCalculator(
    fighterId
) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    combatCalculatorFighterId =
        fighterId;

    combatCalculatorMyWeaponId = null;

    combatCalculatorOpponentWarbandId = null;

    combatCalculatorOpponentFighter = null;

    combatCalculatorOpponentWeaponId = null;

    combatCalculatorShootingModifiers = {
        cover: false,
        longRange: false,
        movingAndShooting: false,
        largeTarget: false
    };

    combatCalculatorTwoWeapons = false;


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    <h2>
                        Combat Calculator
                    </h2>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="closeCombatCalculator()"
                >
                    ×
                </button>

            </div>


            <div
                class="mm-modal-body"
                id="combat-calc-body"
            >

                ${renderCombatCalculatorEntryStep(
                    fighter
                )}

            </div>

        </div>

    `);

}


/*
 * Only hand-to-hand weapons are supported right now - shooting
 * uses a different, unopposed To Hit chart based on the shooter's
 * own Ballistic Skill plus situational modifiers (cover, range,
 * movement), not the WS-vs-WS chart this calculator is built
 * around. Ranged weapons are left out of the picker rather than
 * silently given the wrong numbers.
 */

function isMeleeWeapon(
    item
) {

    return (
        item?.weaponProfile?.range === "Close Combat"
    );

}


/*
 * The weapon pickers show any weapon, melee or ranged - which one
 * gets picked as "my weapon" is what decides whether the results
 * screen shows the two-way melee exchange or the one-way shooting
 * calculation (see renderCombatCalculatorResults).
 */

function isCombatWeapon(
    item
) {

    return !!item?.weaponProfile;

}


function renderWeaponRangeLabel(
    item
) {

    return isMeleeWeapon(item)
        ? "Close Combat"
        : item.weaponProfile.range;

}


/*
 * The entry step every Combat Calculator session starts on - the
 * weapon picker (renderCombatCalculatorMyWeaponStep), plus, for a
 * wizard, a "Cast a Spell" reference alongside it. Casting isn't
 * folded into the weapon/opponent/results flow below because spell
 * effects are too varied to resolve generically (heal, damage,
 * movement, buffs...) - it's a rules lookup only, same "shows the
 * numbers, never rolls, never applies the effect" boundary as the
 * rest of this calculator.
 */

function renderCombatCalculatorEntryStep(
    fighter
) {

    const fighterType =
        getCombatCalculatorFighterType();

    const weaponStep =
        renderCombatCalculatorMyWeaponStep(
            fighter
        );


    if (!fighterType?.wizard) {

        return weaponStep;

    }


    return `

        ${weaponStep}


        <div class="mm-combat-calc-spell-entry">

            <p class="mm-muted">
                Or, instead of fighting -
            </p>

            <button
                type="button"
                class="mm-button"
                onclick="showCombatCalculatorSpellStep()"
            >
                Cast a Spell
            </button>

        </div>

    `;

}


function renderCombatCalculatorMyWeaponStep(
    fighter
) {

    const weapons =
        (fighter.equipment || [])
            .map(
                id =>
                    getEquipment(id)
            )
            .filter(isCombatWeapon);


    if (!weapons.length) {

        const fighterType =
            getCombatCalculatorFighterType();

        return `

            <p class="mm-muted">
                ${escapeHtml(fighter.name)} has no
                weapon equipped${
                    fighterType?.wizard
                        ? ""
                        : ", so there's nothing to calculate."
                }
            </p>

        `;

    }


    return `

        <p class="mm-muted">
            Which weapon is
            ${escapeHtml(fighter.name)}
            fighting with?
        </p>


        <div class="mm-warband-select-list">

            ${weapons
                .map(
                    item => `
                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="selectCombatCalculatorMyWeapon('${escapeAttribute(item.id)}')"
                        >
                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                            <span>
                                ${escapeHtml(renderWeaponRangeLabel(item))}
                            </span>
                        </button>
                    `
                )
                .join("")}

        </div>

    `;

}


function selectCombatCalculatorMyWeapon(
    itemId
) {

    combatCalculatorMyWeaponId =
        itemId;

    combatCalculatorTwoWeapons = false;


    refreshCombatCalculatorBody(
        renderCombatCalculatorOpponentWarbandStep()
    );

}


/* ============================================================
   COMBAT CALCULATOR - CAST A SPELL

   A reference screen only - lists this fighter's known spells
   with their Difficulty and full effect text. The actual 2D6 roll
   happens at the table; nothing here is applied automatically, the
   same boundary as the rest of the Combat Calculator. If the spell
   causes a wound, record it the normal way (Fighter Game Update's
   Injuries section) once it resolves.
   ============================================================ */

function showCombatCalculatorSpellStep() {

    const fighter =
        getCombatCalculatorFighter();

    const fighterType =
        getCombatCalculatorFighterType();


    if (!fighter || !fighterType?.wizard) {

        return;

    }


    refreshCombatCalculatorBody(
        renderCombatCalculatorSpellStep(
            fighter,
            fighterType
        )
    );

}


function renderCombatCalculatorSpellStep(
    fighter,
    fighterType
) {

    const wizardType =
        fighterType.wizard;

    const spellList =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.getSpellList === "function"
            ? RulesEngine.getSpellList(
                wizardType,
                state.magic
            )
            : [];

    const known =
        (fighter.spells || [])
            .map(
                roll =>
                    spellList.find(
                        spell =>
                            spell.roll === roll
                    )
            )
            .filter(Boolean);


    const castingRules =
        state.magic?.castingRules?.description;


    return `

        <p class="mm-muted">
            ${escapeHtml(fighter.name)}'s known spells.
            Roll 2D6 and compare to the Difficulty at the
            table - nothing here is applied automatically.
        </p>


        ${
            castingRules
                ? `
                    <div class="mm-rule-description">
                        ${formatRuleText(castingRules)}
                    </div>
                `
                : ""
        }


        ${
            known.length
                ? `
                    <ul class="mm-injury-list">

                        ${known
                            .map(
                                spell => `

                                    <li>

                                        <span>

                                            <strong>
                                                ${escapeHtml(spell.name)}
                                            </strong>

                                            <small>
                                                Difficulty ${spell.difficulty}+
                                            </small>

                                            <p class="mm-skill-description">
                                                ${escapeHtml(spell.effect)}
                                            </p>

                                        </span>

                                    </li>

                                `
                            )
                            .join("")}

                    </ul>
                `
                : `
                    <p class="mm-muted">
                        No spells recorded yet for
                        ${escapeHtml(fighter.name)} -
                        add one from Edit Fighter first.
                    </p>
                `
        }


        <div class="mm-picker-actions">

            <button
                type="button"
                class="mm-button"
                onclick="refreshCombatCalculatorBody(renderCombatCalculatorEntryStep(getCombatCalculatorFighter()))"
            >
                ← Back
            </button>

        </div>

    `;

}


function renderCombatCalculatorOpponentWarbandStep() {

    const warband =
        getCurrentWarband();

    const game =
        getCombatCalculatorGame();


    if (!game) {

        return `

            <p class="mm-muted">
                This warband isn't currently in a
                game.
            </p>

        `;

    }


    const opponentIds =
        (game.warbandIds || []).filter(
            id =>
                id !== warband.id
        );


    if (!opponentIds.length) {

        return `

            <p class="mm-muted">
                No other warbands are in this
                game yet.
            </p>

        `;

    }


    return `

        <p class="mm-muted">
            Which warband is the opponent in?
        </p>


        <div class="mm-warband-select-list">

            ${opponentIds
                .map(
                    id => {

                        const stub =
                            getWarbandOrStub(id);


                        return `
                            <button
                                type="button"
                                class="mm-warband-select-option"
                                onclick="selectCombatCalculatorOpponentWarband('${escapeAttribute(id)}')"
                            >
                                <strong>
                                    ${escapeHtml(
                                        stub?.name ||
                                        "Unknown Warband"
                                    )}
                                </strong>

                                ${
                                    stub?.owner
                                        ? `
                                            <span>
                                                ${escapeHtml(stub.owner)}
                                            </span>
                                        `
                                        : ""
                                }
                            </button>
                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


async function selectCombatCalculatorOpponentWarband(
    warbandId
) {

    combatCalculatorOpponentWarbandId =
        warbandId;


    refreshCombatCalculatorBody(`
        <p class="mm-muted">
            Loading fighters...
        </p>
    `);


    const game =
        getCombatCalculatorGame();


    if (!game) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "get_game_warband_fighters",
            {

                target_warband_id:
                    warbandId,

                target_game_id:
                    game.id

            }
        );


    if (error) {

        refreshCombatCalculatorBody(`
            <p class="mm-muted">
                Unable to load that warband's
                fighters: ${escapeHtml(error.message)}
            </p>
        `);

        return;

    }


    const fighters =
        (data || []).map(
            row => ({

                id:
                    row.id,

                name:
                    row.name,

                category:
                    row.category,

                typeName:
                    row.type_name

            })
        );


    refreshCombatCalculatorBody(
        renderCombatCalculatorOpponentFighterStep(
            fighters
        )
    );

}


function renderCombatCalculatorOpponentFighterStep(
    fighters
) {

    if (!fighters.length) {

        return `

            <p class="mm-muted">
                That warband has no fighters
                recorded.
            </p>

        `;

    }


    return `

        <p class="mm-muted">
            Which fighter?
        </p>


        <div class="mm-warband-select-list">

            ${fighters
                .map(
                    fighter => `
                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="selectCombatCalculatorOpponentFighter('${escapeAttribute(fighter.id)}')"
                        >
                            <strong>
                                ${escapeHtml(fighter.name)}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    fighter.typeName ||
                                    fighter.category
                                )}
                            </span>
                        </button>
                    `
                )
                .join("")}

        </div>

    `;

}


async function selectCombatCalculatorOpponentFighter(
    fighterId
) {

    refreshCombatCalculatorBody(`
        <p class="mm-muted">
            Loading fighter...
        </p>
    `);


    const game =
        getCombatCalculatorGame();


    if (!game) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "get_game_fighter_combat_profile",
            {

                target_fighter_id:
                    fighterId,

                target_game_id:
                    game.id

            }
        );


    if (
        error ||
        !data ||
        !data.length
    ) {

        refreshCombatCalculatorBody(`
            <p class="mm-muted">
                Unable to load that fighter's
                stats: ${escapeHtml(
                    error?.message ||
                    "not found"
                )}
            </p>
        `);

        return;

    }


    const row =
        data[0];


    combatCalculatorOpponentFighter = {

        id:
            row.id,

        name:
            row.name,

        category:
            row.category,

        typeName:
            row.type_name,

        profile:
            row.profile || {},

        equipment:
            Array.isArray(row.equipment)
                ? row.equipment
                : []

    };

    combatCalculatorOpponentWeaponId = null;


    /*
     * Shooting isn't a mutual exchange the way melee is - it
     * happens in its own phase, one shooter at a time - so a
     * ranged "my weapon" skips straight to the (one-way) results
     * instead of asking which weapon the opponent is fighting
     * with, which is only relevant for melee's two-way exchange.
     */

    const myWeapon =
        getEquipment(
            combatCalculatorMyWeaponId
        );


    refreshCombatCalculatorBody(
        isMeleeWeapon(myWeapon)
            ? renderCombatCalculatorOpponentWeaponStep()
            : renderCombatCalculatorResults()
    );

}


function renderCombatCalculatorOpponentWeaponStep() {

    const opponent =
        combatCalculatorOpponentFighter;


    const weapons =
        (opponent.equipment || [])
            .map(
                id =>
                    getEquipment(id)
            )
            .filter(isMeleeWeapon);


    return `

        <p class="mm-muted">
            Which weapon is
            ${escapeHtml(opponent.name)}
            fighting with?
        </p>


        <div class="mm-warband-select-list">

            ${weapons
                .map(
                    item => `
                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="selectCombatCalculatorOpponentWeapon('${escapeAttribute(item.id)}')"
                        >
                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>
                        </button>
                    `
                )
                .join("")}

            <button
                type="button"
                class="mm-warband-select-option"
                onclick="selectCombatCalculatorOpponentWeapon('')"
            >
                <strong>
                    No weapon / skip
                </strong>

                <span>
                    Only show your attack
                </span>
            </button>

        </div>

    `;

}


function selectCombatCalculatorOpponentWeapon(
    itemId
) {

    combatCalculatorOpponentWeaponId =
        itemId || null;


    refreshCombatCalculatorBody(
        renderCombatCalculatorResults()
    );

}


/*
 * One side of a fight - the numbers an attacker with `weapon`
 * needs against a defender with `defenderEquipment`, plus the
 * Parry/Knocked-Down/Stunned reference notes. Shared by both
 * directions in renderCombatCalculatorResults() below.
 */

/*
 * Turns a raw target number into what's actually shown - a
 * shooting result can fall to 1 or below (chart + modifiers
 * making the shot unmissable) or climb past 6 (impossible), which
 * "N+" can't express on its own.
 */

function formatCombatTarget(
    value,
    impossibleLabel
) {

    if (value === null) {

        return impossibleLabel;

    }

    if (value <= 1) {

        return "Always hits";

    }

    if (value > 6) {

        return impossibleLabel;

    }

    return value + "+";

}


function renderCombatExchange(
    options
) {

    const {
        defenderName,
        attackerWS,
        defenderWS,
        attackerStrength,
        defenderToughness,
        defenderEquipment,
        weapon,
        defenderOwnStrength,
        isRanged,
        ballisticSkill,
        shootingModifiers
    } = options;


    if (
        isRanged &&
        weapon.moveOrFire &&
        shootingModifiers?.movingAndShooting
    ) {

        return `

            <p class="mm-muted">
                Cannot fire this turn - ${escapeHtml(weapon.name)}
                is Move or Fire, and Moving &amp; Shooting is
                checked below.
            </p>

        `;

    }


    const toHit =
        isRanged
            ? RulesEngine.getShootingToHitTarget(
                ballisticSkill,
                shootingModifiers,
                state.combat
            )
            : RulesEngine.getToHitTarget(
                attackerWS,
                defenderWS,
                state.combat
            );

    const toWound =
        RulesEngine.getToWoundTarget(
            attackerStrength,
            defenderToughness,
            state.combat
        );

    const save =
        RulesEngine.getArmourSaveTarget(
            defenderEquipment,
            state.equipment,
            attackerStrength,
            state.combat
        );

    const parry =
        RulesEngine.getParryAvailability(
            defenderEquipment,
            state.equipment,
            attackerStrength,
            defenderOwnStrength
        );


    return `

        <div class="mm-rule-stat">
            <span>
                ${
                    isRanged
                        ? `To Hit (Ballistic Skill ${ballisticSkill})`
                        : "To Hit"
                }
            </span>
            <strong>
                ${formatCombatTarget(toHit, "-")}
            </strong>
        </div>

        <div class="mm-rule-stat">
            <span>
                To Wound (Strength ${attackerStrength})
            </span>
            <strong>
                ${toWound !== null ? toWound + "+" : "No chance"}
            </strong>
        </div>

        <div class="mm-rule-stat">
            <span>
                ${escapeHtml(defenderName)}'s Armour Save
            </span>
            <strong>
                ${save !== null ? save + "+" : "No save"}
            </strong>
        </div>


        ${
            weapon.weaponProfile?.special
                ? `
                    <p class="mm-muted">
                        ${escapeHtml(weapon.name)}:
                        ${escapeHtml(weapon.weaponProfile.special)}
                    </p>
                `
                : ""
        }


        ${
            !isRanged && parry.hasParryItem
                ? `
                    <p class="mm-muted">
                        ${
                            parry.eligible
                                ? `${escapeHtml(defenderName)} may Parry: roll higher than the to-hit roll on a D6 to cancel this hit (impossible against a natural 6).`
                                : `${escapeHtml(defenderName)} carries a Parry item, but can't use it here - the attacker's Strength (${attackerStrength}) is double their own Strength (${defenderOwnStrength}) or more.`
                        }
                    </p>
                `
                : ""
        }


        ${
            !isRanged
                ? `
                    <p class="mm-muted">
                        If ${escapeHtml(defenderName)} is already
                        Knocked Down, this attack hits automatically
                        (no To Hit roll) and they cannot Parry. If
                        Stunned, a hit here automatically takes them
                        Out of Action - no To Wound or save roll
                        needed.
                    </p>
                `
                : ""
        }

    `;

}


/*
 * The existing two-way "you attack them / they attack you" screen
 * - unchanged behaviour, just pulled out of
 * renderCombatCalculatorResults so it can sit alongside the new
 * one-way shooting section below.
 */

function renderMeleeExchangeSections(
    myFighter,
    myProfile,
    opponent,
    opponentProfile,
    myWeapon
) {

    const opponentWeapon =
        combatCalculatorOpponentWeaponId
            ? getEquipment(combatCalculatorOpponentWeaponId)
            : null;


    const myAttack =
        myWeapon
            ? renderCombatExchange({

                defenderName:
                    opponent.name,

                attackerWS:
                    myProfile.WS,

                defenderWS:
                    opponentProfile.WS,

                attackerStrength:
                    RulesEngine.resolveWeaponStrength(
                        myWeapon.weaponProfile,
                        myProfile.S
                    ),

                defenderToughness:
                    opponentProfile.T,

                defenderEquipment:
                    opponent.equipment,

                weapon:
                    myWeapon,

                defenderOwnStrength:
                    opponentProfile.S

            })
            : `
                <p class="mm-muted">
                    You have no weapon selected.
                </p>
            `;


    const theirAttack =
        opponentWeapon
            ? renderCombatExchange({

                defenderName:
                    myFighter.name,

                attackerWS:
                    opponentProfile.WS,

                defenderWS:
                    myProfile.WS,

                attackerStrength:
                    RulesEngine.resolveWeaponStrength(
                        opponentWeapon.weaponProfile,
                        opponentProfile.S
                    ),

                defenderToughness:
                    myProfile.T,

                defenderEquipment:
                    myFighter.equipment,

                weapon:
                    opponentWeapon,

                defenderOwnStrength:
                    myProfile.S

            })
            : `
                <p class="mm-muted">
                    ${escapeHtml(opponent.name)} has no
                    weapon selected.
                </p>
            `;


    const canFightWithTwoWeapons =
        myWeapon &&
        !myWeapon.preventsSecondWeapon;


    return `

        <section class="mm-editor-section">

            <h3>
                ${escapeHtml(myFighter.name)} attacks
                ${escapeHtml(opponent.name)}
            </h3>

            ${
                canFightWithTwoWeapons
                    ? renderTwoWeaponsToggle()
                    : ""
            }

            ${
                canFightWithTwoWeapons &&
                combatCalculatorTwoWeapons
                    ? `
                        <p class="mm-muted">
                            Fighting with Two Weapons:
                            ${escapeHtml(myFighter.name)}
                            gets +1 Attack, added after any other
                            Attack modifiers. If the second weapon
                            is a different one to
                            ${escapeHtml(myWeapon.name)}, choose
                            which weapon covers which attack, and
                            roll to hit/wound separately for the
                            other weapon - re-run this calculator
                            with it selected for its own numbers.
                        </p>
                    `
                    : ""
            }

            ${myAttack}

        </section>


        <section class="mm-editor-section">

            <h3>
                ${escapeHtml(opponent.name)} attacks
                ${escapeHtml(myFighter.name)}
            </h3>

            ${theirAttack}

        </section>

    `;

}


/*
 * Shooting is one-directional (see the Context in the plan this
 * was built from) - just this fighter's shot at the chosen
 * opponent, with the four real situational modifiers as live
 * checkboxes above the numbers.
 */

function renderShootingModifierToggle(
    key,
    label
) {

    return `

        <label class="mm-equipment-option">

            <input
                type="checkbox"
                ${combatCalculatorShootingModifiers[key] ? "checked" : ""}
                onchange="toggleCombatCalculatorShootingModifier('${key}')"
            >

            <span>
                <strong>
                    ${escapeHtml(label)}
                </strong>
            </span>

        </label>

    `;

}


function toggleCombatCalculatorShootingModifier(
    key
) {

    combatCalculatorShootingModifiers[key] =
        !combatCalculatorShootingModifiers[key];


    refreshCombatCalculatorBody(
        renderCombatCalculatorResults()
    );

}


/*
 * Fighting with Two Weapons - a core rule this calculator had never
 * surfaced: a warrior carrying two one-handed close combat weapons
 * gets +1 Attack, made with whichever of the two weapons he
 * chooses. Only offered when the selected weapon doesn't itself
 * rule out a second weapon (two-handed, Heavy, etc.) - see
 * equipment.json's preventsSecondWeapon flag.
 */

function renderTwoWeaponsToggle() {

    return `

        <label class="mm-equipment-option">

            <input
                type="checkbox"
                ${combatCalculatorTwoWeapons ? "checked" : ""}
                onchange="toggleCombatCalculatorTwoWeapons()"
            >

            <span>
                <strong>
                    Also fighting with a second one-handed weapon
                </strong>
            </span>

        </label>

    `;

}


function toggleCombatCalculatorTwoWeapons() {

    combatCalculatorTwoWeapons =
        !combatCalculatorTwoWeapons;


    refreshCombatCalculatorBody(
        renderCombatCalculatorResults()
    );

}


function renderShootingExchangeSection(
    myFighter,
    myProfile,
    opponent,
    opponentProfile,
    myWeapon
) {

    const exchange =
        myWeapon
            ? renderCombatExchange({

                defenderName:
                    opponent.name,

                attackerStrength:
                    RulesEngine.resolveWeaponStrength(
                        myWeapon.weaponProfile,
                        myProfile.S
                    ),

                defenderToughness:
                    opponentProfile.T,

                defenderEquipment:
                    opponent.equipment,

                weapon:
                    myWeapon,

                defenderOwnStrength:
                    opponentProfile.S,

                isRanged:
                    true,

                ballisticSkill:
                    myProfile.BS,

                shootingModifiers:
                    combatCalculatorShootingModifiers

            })
            : `
                <p class="mm-muted">
                    You have no weapon selected.
                </p>
            `;


    return `

        <section class="mm-editor-section">

            <h3>
                ${escapeHtml(myFighter.name)} shoots
                ${escapeHtml(opponent.name)}
            </h3>

            <p class="mm-muted">
                No generic "Aim" action exists in Mordheim -
                these are the real situational modifiers
                (rulebook p15).
            </p>

            <div class="mm-warband-select-list">
                ${renderShootingModifierToggle("cover", "Cover (-1)")}
                ${renderShootingModifierToggle("longRange", "Long Range - beyond half the weapon's max range (-1)")}
                ${renderShootingModifierToggle("movingAndShooting", "Moving & Shooting - this fighter moved this turn (-1)")}
                ${renderShootingModifierToggle("largeTarget", `${escapeHtml(opponent.name)} is a Large Target (+1)`)}
            </div>

            ${exchange}

        </section>

    `;

}


function renderCombatCalculatorResults() {

    const myFighter =
        getCombatCalculatorFighter();

    const opponent =
        combatCalculatorOpponentFighter;


    if (
        !myFighter ||
        !opponent
    ) {

        return `

            <p class="mm-muted">
                Something went wrong setting up
                this fight.
            </p>

        `;

    }


    const myProfile =
        RulesEngine.calculateEffectiveProfile(
            myFighter
        );

    const opponentProfile =
        opponent.profile || {};


    const myWeapon =
        getEquipment(
            combatCalculatorMyWeaponId
        );


    const combatSections =
        isMeleeWeapon(myWeapon)
            ? renderMeleeExchangeSections(
                myFighter,
                myProfile,
                opponent,
                opponentProfile,
                myWeapon
            )
            : renderShootingExchangeSection(
                myFighter,
                myProfile,
                opponent,
                opponentProfile,
                myWeapon
            );


    return `

        ${combatSections}


        <section class="mm-editor-section">

            <h3>
                Critical Hits
            </h3>

            <p class="mm-muted">
                On an unmodified roll of 6 to wound
                (reference only - not applied above):
            </p>

            ${(state.combat?.criticalHitChart || [])
                .map(
                    row => `
                        <div class="mm-rule-stat">
                            <span>
                                ${escapeHtml(row.roll)} -
                                ${escapeHtml(row.label)}
                            </span>
                        </div>
                    `
                )
                .join("")}

        </section>


        <div class="mm-picker-actions">

            <button
                type="button"
                class="mm-button"
                onclick="closeCombatCalculator()"
            >
                No Effect - Conclude Fight
            </button>

            <button
                type="button"
                class="mm-button"
                onclick="confirmCombatWound()"
            >
                Record a wound on
                ${escapeHtml(myFighter.name)}
            </button>

            ${
                myFighter.category === "hero"
                    ? `
                        <button
                            type="button"
                            class="mm-button mm-button-primary"
                            onclick="confirmCombatCasualtyXP()"
                        >
                            Caused a casualty (+1 XP)
                        </button>
                    `
                    : ""
            }

        </div>

    `;

}


/*
 * Both "conclude" actions leave the calculator's own results
 * screen in place until Continue is actually clicked - nothing is
 * touched (no navigation, no pre-filled value) until then, so
 * "Back" is simply re-rendering results with no state to undo.
 */

function confirmCombatWound() {

    const myFighter =
        getCombatCalculatorFighter();


    if (!myFighter) {

        return;

    }


    refreshCombatCalculatorBody(`

        <p class="mm-muted">
            Record a wound on
            ${escapeHtml(myFighter.name)}?
            This opens their Injuries section
            so you can pick what actually
            happened.
        </p>


        <div class="mm-picker-actions">

            <button
                type="button"
                class="mm-button"
                onclick="refreshCombatCalculatorBody(renderCombatCalculatorResults())"
            >
                ← Back
            </button>

            <button
                type="button"
                class="mm-button mm-button-primary"
                onclick="recordCombatWound()"
            >
                Continue
            </button>

        </div>

    `);

}


function confirmCombatCasualtyXP() {

    const myFighter =
        getCombatCalculatorFighter();


    if (!myFighter) {

        return;

    }


    const currentXp =
        Number(myFighter.experience) || 0;


    refreshCombatCalculatorBody(`

        <p class="mm-muted">
            Credit ${escapeHtml(myFighter.name)}
            with +1 Experience for causing a
            casualty?
        </p>

        <div class="mm-rule-stat">
            <span>
                Current Experience
            </span>
            <strong>
                ${currentXp} XP
            </strong>
        </div>

        <div class="mm-rule-stat">
            <span>
                Proposed New Total
            </span>
            <strong>
                ${currentXp + 1} XP
            </strong>
        </div>


        <div class="mm-picker-actions">

            <button
                type="button"
                class="mm-button"
                onclick="refreshCombatCalculatorBody(renderCombatCalculatorResults())"
            >
                ← Back
            </button>

            <button
                type="button"
                class="mm-button mm-button-primary"
                onclick="recordCombatCasualtyXP()"
            >
                Continue
            </button>

        </div>

    `);

}


async function recordCombatWound() {

    const fighterId =
        combatCalculatorFighterId;


    closeCombatCalculator();

    showFighterGameUpdate(
        fighterId
    );


    /*
     * Actually decrements Wounds now, rather than just opening the
     * Injuries section with nothing recorded yet - reuses the same
     * immediate-persist action the Wounds section's own button
     * calls, so a wound taken via the calculator behaves exactly
     * like one recorded directly in the modal (including the
     * Knocked Down/Stunned/Out of Action prompt if it hits zero).
     */

    await recordFighterWound(
        fighterId
    );

}


function recordCombatCasualtyXP() {

    const fighterId =
        combatCalculatorFighterId;


    closeCombatCalculator();

    showFighterGameUpdate(
        fighterId
    );


    const xpInput =
        document.getElementById(
            "fighter-game-xp"
        );


    if (xpInput) {

        xpInput.value =
            (Number(xpInput.value) || 0) + 1;

        updateFighterGameXpDelta();

    }

}


/* ============================================================
   LIVE EQUIPMENT VALIDATION
   ============================================================ */

function setupFighterEquipmentValidation(
    fighter,
    definition
) {

    const checkboxes =
        document.querySelectorAll(
            ".mm-equipment-selection input[type='checkbox']"
        );


    const validationContainer =
        document.getElementById(
            "fighter-equipment-validation"
        );


    if (
        !checkboxes.length ||
        !validationContainer
    ) {

        return;

    }


    function validateSelection() {

        const selectedEquipment =
            Array.from(
                checkboxes
            )
                .filter(
                    checkbox =>
                        checkbox.checked
                )
                .map(
                    checkbox =>
                        checkbox.value
                );


        const warband =
            getCurrentWarband();


        if (!warband) {

            return;

        }


        const validation =
            RulesEngine.validateEquipmentChange(
                warband,
                fighter,
                selectedEquipment,
                definition,
                state.equipment
            );


        validationContainer.innerHTML =
            renderEquipmentValidation(
                validation
            );


        /*
         * Disable Save while the equipment
         * selection is invalid.
         */

        const saveButton =
            document.querySelector(
                ".mm-modal-footer .mm-button-primary"
            );


        if (saveButton) {

            saveButton.disabled =
                !validation.valid;

        }


        /*
         * Keep the cost breakdown in sync with
         * whatever is currently checked, not just
         * what was saved last.
         */

        const costContainer =
            document.getElementById(
                "fighter-cost-breakdown"
            );


        if (costContainer) {

            costContainer.innerHTML =
                renderFighterCostBreakdown(
                    fighter,
                    selectedEquipment,
                    editingFighterMutations
                );

        }

    }


    checkboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                validateSelection
            );

        }
    );


    /*
     * Validate the initial selection too.
     */

    validateSelection();

}


/* ============================================================
   INJURY TAG / DETAIL

   Same clickable-pill-plus-detail-modal pattern as
   renderEquipmentTag (equipment.js) and renderSkillTag (skills.js)
   - an injury tag shown anywhere on a fighter should open what it
   actually means, not just repeat the name.
   ============================================================ */

function renderInjuryTag(
    injuryId,
    fallbackName
) {

    const injury =
        RulesEngine.findInjury(
            injuryId,
            state.injuries
        );


    if (!injury) {

        return `

            <span class="mm-equipment-tag">
                ${escapeHtml(fallbackName || injuryId)}
            </span>

        `;

    }


    return `

        <button
            type="button"
            class="mm-equipment-tag"
            onclick="showInjury('${escapeAttribute(injury.id)}')"
        >

            ${escapeHtml(injury.name)}

        </button>

    `;

}


function showInjury(
    injuryId
) {

    const injury =
        RulesEngine.findInjury(
            injuryId,
            state.injuries
        );


    if (!injury) {

        return;

    }


    const canGoBack =
        modalCanGoBack();


    const statModifierRows =
        injury.statModifiers &&
        Object.keys(injury.statModifiers).length
            ? Object.entries(injury.statModifiers)
                .map(
                    ([stat, value]) => `
                        <div class="mm-rule-stat">
                            <span>
                                ${escapeHtml(stat)}
                            </span>
                            <strong>
                                ${value > 0 ? "+" : ""}${value}
                            </strong>
                        </div>
                    `
                )
                .join("")
            : "";


    pushModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    ${
                        canGoBack
                            ? `
                                <button
                                    class="mm-back-button mm-modal-back"
                                    onclick="goBackModal()"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    ${
                        injury.rollRange
                            ? `
                                <span class="mm-badge">
                                    ${escapeHtml(injury.rollRange)}
                                </span>
                            `
                            : ""
                    }

                    <h2>
                        ${escapeHtml(injury.name)}
                    </h2>

                </div>


                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                ${statModifierRows}

                <div class="mm-rule-description">
                    ${formatRuleText(
                        injury.description ||
                        "No description available."
                    )}
                </div>

                ${renderSourceInformation(
                    state.injuries,
                    injury.sourcePage
                )}

            </div>

        </div>

    `);

}


/* ============================================================
   INJURIES EDITOR
   ============================================================ */

function renderInjuriesEditorList() {

    if (!editingInjuries.length) {

        return `

            <p class="mm-muted">
                No injuries recorded.
            </p>

        `;

    }


    return `

        <ul class="mm-injury-list">

            ${editingInjuries
                .map(
                    (injury, index) => `

                        <li>

                            <span>

                                <strong>
                                    ${escapeHtml(
                                        injury.name
                                    )}
                                </strong>

                                ${
                                    injury.statModifiers &&
                                    Object.keys(injury.statModifiers).length
                                        ? `
                                            <small>
                                                ${Object.entries(injury.statModifiers)
                                                    .map(
                                                        ([stat, value]) =>
                                                            `${stat} ${value > 0 ? "+" : ""}${value}`
                                                    )
                                                    .join(", ")}
                                            </small>
                                        `
                                        : ""
                                }

                            </span>

                            <button
                                type="button"
                                class="mm-button mm-button-small mm-button-danger"
                                onclick="removeInjuryFromEditor(${index})"
                            >
                                Remove
                            </button>

                        </li>

                    `
                )
                .join("")}

        </ul>

    `;

}


function addInjuryToEditor() {

    const select =
        document.getElementById(
            "new-injury-select"
        );


    const injuryId =
        select?.value;


    if (!injuryId) {

        return;

    }


    const injury =
        RulesEngine.findInjury(
            injuryId,
            state.injuries
        );


    if (!injury) {

        return;

    }


    editingInjuries.push({

        id:
            injury.id,

        name:
            injury.name,

        description:
            injury.description,

        statModifiers:
            { ...(injury.statModifiers || {}) },

        date:
            new Date().toISOString()

    });


    const list =
        document.getElementById(
            "fighter-injuries-list"
        );


    if (list) {

        list.innerHTML =
            renderInjuriesEditorList();

    }

}


function renderInjuriesIntroText(
    outOfAction,
    isHero
) {

    return outOfAction
        ? `Out of Action this battle - ${
            isHero
                ? "roll on the Serious Injuries chart below."
                : "record the Henchman check below."
        }`
        : "Only a fighter who ends the battle Out of Action rolls for injuries - use this only if you already know the result.";

}


/*
 * A Henchman's Out of Action check (rulebook p79, verified) is a
 * simple D6, not the Hero D66 chart above - "removed" is what
 * saveFighterGameUpdate looks for to set status: 'dead', matching
 * how a Hero's literal "Dead" injury does the same. Replaces any
 * previous henchman-outcome entry rather than stacking duplicates,
 * since only one result is meaningful per game.
 */

function recordHenchmanOutcome(
    outcome
) {

    editingInjuries =
        editingInjuries.filter(
            injury =>
                injury.id !== "henchman-removed" &&
                injury.id !== "henchman-fine"
        );


    editingInjuries.push(
        outcome === "removed"
            ? {

                id:
                    "henchman-removed",

                name:
                    "Removed from Roster",

                description:
                    state.injuries?.henchmanOutOfAction?.description || "",

                date:
                    new Date().toISOString()

            }
            : {

                id:
                    "henchman-fine",

                name:
                    "Fine, Fights On",

                description:
                    "Rolled 3-6 on the Henchman Out of Action check - no lasting effect.",

                date:
                    new Date().toISOString()

            }
    );


    const list =
        document.getElementById(
            "fighter-injuries-list"
        );


    if (list) {

        list.innerHTML =
            renderInjuriesEditorList();

    }

}


function removeInjuryFromEditor(
    index
) {

    editingInjuries.splice(
        index,
        1
    );


    const list =
        document.getElementById(
            "fighter-injuries-list"
        );


    if (list) {

        list.innerHTML =
            renderInjuriesEditorList();

    }

}


/* ============================================================
   SKILLS EDITOR

   Direct copy of the injuries editor pattern above, against
   editingSkills/editingSkillOptions instead.
   ============================================================ */

function renderSkillsEditorList() {

    if (!editingSkills.length) {

        return `

            <p class="mm-muted">
                No skills recorded.
            </p>

        `;

    }


    return `

        <ul class="mm-injury-list">

            ${editingSkills
                .map(
                    (skill, index) => `

                        <li>

                            <span>

                                <strong>
                                    ${escapeHtml(
                                        skill.name
                                    )}
                                </strong>

                                ${
                                    skill.category
                                        ? `
                                            <small>
                                                ${escapeHtml(
                                                    skill.category
                                                )}
                                            </small>
                                        `
                                        : ""
                                }

                                ${
                                    skill.description
                                        ? `
                                            <p class="mm-skill-description">
                                                ${escapeHtml(
                                                    skill.description
                                                )}
                                            </p>
                                        `
                                        : ""
                                }

                            </span>

                            <button
                                type="button"
                                class="mm-button mm-button-small mm-button-danger"
                                onclick="removeSkillFromEditor(${index})"
                            >
                                Remove
                            </button>

                        </li>

                    `
                )
                .join("")}

        </ul>

    `;

}


/*
 * Removing a skill also removes the "new-skill" advance log entry
 * that earned it (matched by skillId) - otherwise the fighter
 * would keep the XP-threshold slot "used up" with nothing to show
 * for it, and the player could never re-record the correct skill.
 */

function removeSkillFromEditor(
    index
) {

    const [removed] =
        editingSkills.splice(
            index,
            1
        );


    if (removed) {

        const advanceIndex =
            editingAdvances.findIndex(
                advance =>
                    advance.type === "new-skill" &&
                    advance.skillId === removed.id
            );


        if (advanceIndex !== -1) {

            editingAdvances.splice(
                advanceIndex,
                1
            );

        }

    }


    const list =
        document.getElementById(
            "fighter-skills-list"
        );


    if (list) {

        list.innerHTML =
            renderSkillsEditorList();

    }


    refreshAdvanceSection();

}


/* ============================================================
   PROFILE STAT (READ ONLY)
   ============================================================ */

function renderReadOnlyStat(
    stat,
    value
) {

    return `

        <div class="mm-stat-editor">

            <span>
                ${escapeHtml(
                    stat
                )}
            </span>


            <strong>
                ${escapeHtml(
                    value
                )}
            </strong>

        </div>

    `;

}


/* ============================================================
   EQUIPMENT CHECKBOX
   ============================================================ */

function renderEquipmentCheckbox(
    fighter,
    item,
    inStash
) {

    const selected =
        fighter.equipment.includes(
            item.id
        );


    return `

        <label
            class="mm-equipment-option${
                inStash
                    ? " mm-equipment-option-stash"
                    : ""
            }"
        >

            <input
                type="checkbox"
                value="${escapeAttribute(
                    item.id
                )}"
                ${selected
                    ? "checked"
                    : ""}
            >


            <span>

                <strong>
                    ${escapeHtml(
                        item.name
                    )}
                </strong>


                <small>
                    ${inStash
                        ? "In stash - free"
                        : `${item.cost ?? 0} gc`}
                </small>


                ${
                    item.weaponProfile
                        ? `
                            <small class="mm-weapon-profile">
                                S: ${escapeHtml(item.weaponProfile.strength || "-")}
                                &middot;
                                R: ${escapeHtml(item.weaponProfile.range || "-")}
                                ${
                                    item.weaponProfile.special
                                        ? ` &middot; ${escapeHtml(item.weaponProfile.special)}`
                                        : ""
                                }
                            </small>
                        `
                        : ""
                }

                ${
                    item.armourProfile
                        ? `
                            <small class="mm-weapon-profile">
                                Save: ${escapeHtml(item.armourProfile.save || "-")}
                                ${
                                    item.armourProfile.special
                                        ? ` &middot; ${escapeHtml(item.armourProfile.special)}`
                                        : ""
                                }
                            </small>
                        `
                        : ""
                }

            </span>

        </label>

    `;

}


/* ============================================================
   SAVE FIGHTER
   ============================================================ */

async function saveFighterChanges(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const fighter =
        warband.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        alert(
            "The warband rules could not be found."
        );

        return;

    }


    /*
     * Snapshot so name/equipment/treasury can be rolled
     * back if the database write fails after they have
     * already been mutated in memory below. Injuries/
     * experience/skills are edited from the in-game view
     * (saveFighterGameUpdate) instead, not here.
     */

    const previousName =
        fighter.name;

    const previousEquipment =
        [...fighter.equipment];

    const previousSpells =
        [...(fighter.spells || [])];

    const previousMutations =
        [...(fighter.mutations || [])];

    const previousTreasury =
        warband.treasury;

    const previousStash =
        [...warband.stash];


    const nameInput =
        document.getElementById(
            "edit-fighter-name"
        );


    if (
        nameInput &&
        nameInput.value.trim()
    ) {

        fighter.name =
            nameInput.value.trim();

    }


    /*
     * Collect the equipment selected
     * in the editor.
     */

    const checkboxes =
        document.querySelectorAll(
            ".mm-equipment-selection input[type='checkbox']"
        );


    const newEquipment =
        Array.from(
            checkboxes
        )
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    checkbox.value
            );


    /*
     * Validate the proposed equipment
     * change BEFORE modifying the fighter.
     */

    if (
        typeof RulesEngine === "undefined" ||
        typeof RulesEngine.validateEquipmentChange !==
            "function"
    ) {

        alert(
            "The rules engine is not available."
        );

        fighter.name =
            previousName;

        return;

    }


    const validation =
        RulesEngine.validateEquipmentChange(
            warband,
            fighter,
            newEquipment,
            definition,
            state.equipment
        );


    /*
     * Block invalid equipment selections.
     */

    if (!validation.valid) {

        const messages =
            validation.errors
                .map(
                    error =>
                        `• ${error.message}`
                )
                .join("\n");


        alert(
            "Fighter cannot be saved:\n\n" +
            messages
        );


        fighter.name =
            previousName;

        return;

    }


    /*
     * Mutations are only ever added/removed via the editor's own
     * Add/Remove Mutation controls (editingFighterMutations), never
     * read from the DOM the way equipment is - the picker cost
     * doubling depends on array order, so it is simplest to keep
     * editingFighterMutations as the single source of truth and
     * charge the treasury for whatever it costs beyond what this
     * fighter already cost before this edit.
     */

    const previousMutationsCost =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateMutationsCost === "function"
            ? RulesEngine.calculateMutationsCost(
                previousMutations,
                state.mutations
            )
            : 0;

    const newMutationsCost =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateMutationsCost === "function"
            ? RulesEngine.calculateMutationsCost(
                editingFighterMutations,
                state.mutations
            )
            : 0;

    const mutationsCostDelta =
        newMutationsCost - previousMutationsCost;


    if (mutationsCostDelta > warband.treasury) {

        alert(
            `These mutations cost ${mutationsCostDelta} gc, ` +
            `but this warband only has ${warband.treasury} gc.`
        );

        fighter.name =
            previousName;

        return;

    }


    /*
     * Apply the validated equipment change.
     *
     * This updates both the fighter's
     * equipment and the warband treasury.
     */

    try {

        RulesEngine.applyEquipmentChange(
            warband,
            fighter,
            newEquipment,
            definition,
            state.equipment
        );

    } catch (error) {

        console.error(
            "Equipment change failed:",
            error
        );


        alert(
            error.message ||
            "The equipment change could not be applied."
        );


        fighter.name =
            previousName;

        return;

    }


    fighter.spells =
        [...editingFighterSpells];

    fighter.mutations =
        [...editingFighterMutations];

    warband.treasury =
        warband.treasury - mutationsCostDelta;


    /*
     * Persist only after ALL validation
     * and rule changes have succeeded.
     */

    const {
        error: fighterError
    } =
        await supabaseClient
            .from("fighters")
            .update({

                name:
                    fighter.name,

                equipment:
                    fighter.equipment,

                spells:
                    fighter.spells,

                mutations:
                    fighter.mutations

            })
            .eq(
                "id",
                fighter.id
            );


    if (fighterError) {

        alert(
            "Unable to save fighter: " +
            fighterError.message
        );


        fighter.name =
            previousName;

        fighter.equipment =
            previousEquipment;

        fighter.spells =
            previousSpells;

        fighter.mutations =
            previousMutations;

        warband.treasury =
            previousTreasury;

        warband.stash =
            previousStash;

        return;

    }


    const {
        error: warbandError
    } =
        await supabaseClient
            .from("warbands")
            .update({

                treasury:
                    warband.treasury,

                stash:
                    warband.stash

            })
            .eq(
                "id",
                warband.id
            );


    if (warbandError) {

        console.error(
            "Fighter saved but treasury/stash could not be updated:",
            warbandError.message
        );

    }


    editFighterId = null;


    closeModal();


    renderApplication();

}


/* ============================================================
   SAVE FIGHTER GAME UPDATE (INJURIES / EXPERIENCE / SKILLS)

   Much simpler than saveFighterChanges - no equipment, no
   treasury, no stash, no RulesEngine validation, just the three
   post-battle fields on the fighters row.
   ============================================================ */

async function saveFighterGameUpdate(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const fighter =
        warband.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    const previousInjuries =
        [...fighter.injuries];

    const previousSkills =
        [...fighter.skills];

    const previousExperience =
        fighter.experience;

    const previousProfile =
        { ...fighter.profile };

    const previousCategory =
        fighter.category;

    const previousAdvances =
        [...(fighter.advances || [])];

    const previousStatus =
        fighter.status;


    fighter.injuries =
        [...editingInjuries];

    fighter.skills =
        editingCategory === "hero"
            ? [...editingSkills]
            : fighter.skills;

    fighter.profile =
        { ...editingProfile };

    fighter.category =
        editingCategory;

    fighter.advances =
        [...editingAdvances];


    /*
     * The one Hero Serious Injury result and the one Henchman Out
     * of Action result that actually remove a fighter from the
     * roster (both verified - see the rulebook text quoted in
     * recordHenchmanOutcome and the "dead" injury's own
     * description) - every other result stays exactly what it's
     * always been, an informational tag with no status change.
     */

    const removalRecorded =
        editingCategory === "hero"
            ? editingInjuries.some(
                injury =>
                    injury.id === "dead"
            )
            : editingInjuries.some(
                injury =>
                    injury.id === "henchman-removed"
            );


    if (
        removalRecorded &&
        fighter.status === "active"
    ) {

        fighter.status =
            "dead";

    }


    const xpInput =
        document.getElementById(
            "fighter-game-xp"
        );


    if (xpInput) {

        fighter.experience =
            Math.max(
                0,
                Number(
                    xpInput.value
                ) || 0
            );

    }


    const {
        error
    } =
        await supabaseClient
            .from("fighters")
            .update({

                injuries:
                    fighter.injuries,

                skills:
                    fighter.skills,

                experience:
                    fighter.experience,

                profile:
                    fighter.profile,

                category:
                    fighter.category,

                advances:
                    fighter.advances,

                status:
                    fighter.status

            })
            .eq(
                "id",
                fighter.id
            );


    if (error) {

        alert(
            "Unable to save: " +
            error.message
        );


        fighter.injuries =
            previousInjuries;

        fighter.skills =
            previousSkills;

        fighter.experience =
            previousExperience;

        fighter.profile =
            previousProfile;

        fighter.category =
            previousCategory;

        fighter.advances =
            previousAdvances;

        fighter.status =
            previousStatus;

        return;

    }


    gameUpdateFighterId = null;


    closeModal();


    renderApplication();

}


/* ============================================================
   FIGHTER COST BREAKDOWN
   ============================================================ */

function renderFighterCostBreakdown(
    fighter,
    equipmentIds,
    mutationIds
) {

    const baseCost =
        Number(fighter?.baseCost) || 0;


    const equipmentCost =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateEquipmentCost === "function"
            ? RulesEngine.calculateEquipmentCost(
                equipmentIds,
                state.equipment
            )
            : 0;


    const mutationsCost =
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateMutationsCost === "function"
            ? RulesEngine.calculateMutationsCost(
                mutationIds || [],
                state.mutations
            )
            : 0;


    const totalCost =
        baseCost + equipmentCost + mutationsCost;


    return `

        <div class="mm-cost-breakdown">

            <div class="mm-cost-row">

                <span>
                    Fighter Cost
                </span>

                <strong>
                    ${baseCost} gc
                </strong>

            </div>


            <div class="mm-cost-row">

                <span>
                    Equipment Value
                </span>

                <strong>
                    ${equipmentCost} gc
                </strong>

            </div>


            ${
                mutationIds && mutationIds.length
                    ? `
                        <div class="mm-cost-row">

                            <span>
                                Mutations
                            </span>

                            <strong>
                                ${mutationsCost} gc
                            </strong>

                        </div>
                    `
                    : ""
            }


            <div class="mm-cost-row mm-cost-total">

                <span>
                    Total Cost
                </span>

                <strong>
                    ${totalCost} gc
                </strong>

            </div>

        </div>

    `;

}


/* ============================================================
   EQUIPMENT VALIDATION FEEDBACK
   ============================================================ */

function renderEquipmentValidation(
    validation
) {

    if (!validation) {

        return "";

    }


    if (validation.valid) {

        return `

            <div class="mm-validation mm-validation-success">

                <strong>
                    ✓ Equipment selection is valid
                </strong>

            </div>

        `;

    }


    return `

        <div class="mm-validation mm-validation-error">

            <strong>
                ⚠ Equipment selection is invalid
            </strong>


            <ul>

                ${validation.errors
                    .map(
                        error => `

                            <li>
                                ${escapeHtml(
                                    error.message
                                )}
                            </li>

                        `
                    )
                    .join("")}

            </ul>

        </div>

    `;

}


/* ============================================================
   EQUIPMENT AVAILABILITY
   ============================================================ */

function getAvailableEquipment(
    fighterType,
    warbandType
) {

    const listName =
        fighterType?.equipmentList;


    if (!listName) {

        return [];

    }


    /*
     * Equipment lists belong to the
     * warband definition.
     */

    const definition =
        state.warbandDefinitions[
            warbandType || "reikland"
        ];


    const equipmentList =
        definition
            ?.equipmentLists
            ?.[
                listName
            ];


    if (!equipmentList) {

        return [];

    }


    const ids = [

        ...(equipmentList.closeCombat || []),

        ...(equipmentList.missile || []),

        ...(equipmentList.armour || []),

        ...(equipmentList.miscellaneous || []),

        ...(equipmentList.misc || []),

        ...(equipmentList.special || [])

    ];


    /*
     * Remove duplicates.
     */

    const uniqueIds =
        [...new Set(ids)];


    return uniqueIds

        .map(
            getEquipment
        )

        .filter(
            Boolean
        );

}


/* ============================================================
   RETIRE / RECOVER FIGHTER

   Same soft-status pattern as retireWarband/recoverWarband
   (warbands.js) - a manual, reversible way to get a fighter off
   the active roster (a recruiting mistake, or simply not fielding
   them for now) without the financial refund/stash side effects
   that deleteFighter below has. Retiring is what makes a fighter
   eligible for that permanent delete afterwards.
   ============================================================ */

async function retireFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    const previousStatus =
        fighter.status;


    fighter.status =
        "retired";


    const { error } =
        await supabaseClient
            .from("fighters")
            .update({
                status: "retired"
            })
            .eq(
                "id",
                fighter.id
            );


    if (error) {

        alert(
            "Unable to retire fighter: " +
            error.message
        );

        fighter.status =
            previousStatus;

        return;

    }


    renderApplication();

}


async function recoverFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    const previousStatus =
        fighter.status;


    fighter.status =
        "active";


    const { error } =
        await supabaseClient
            .from("fighters")
            .update({
                status: "active"
            })
            .eq(
                "id",
                fighter.id
            );


    if (error) {

        alert(
            "Unable to recover fighter: " +
            error.message
        );

        fighter.status =
            previousStatus;

        return;

    }


    renderApplication();

}


/* ============================================================
   DELETE FIGHTER
   ============================================================ */

/*
 * Holds the fighter/index removed by performDeleteFighter
 * while the rule-violation warning modal (if any) is open,
 * so cancelFighterRemoval can put them back.
 */

let pendingFighterRemoval = null;


function deleteFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const fighter =
        warband.fighters.find(
            item =>
                item.id ===
                fighterId
        );


    if (!fighter) {

        return;

    }


    /*
     * A dead fighter is permanent history (see the plan this was
     * built from) - the roster card never renders this button for
     * one, but guard here too in case it's ever called some other
     * way.
     */

    if (fighter.status === "dead") {

        return;

    }


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Remove Fighter
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Remove
                    ${escapeHtml(fighter.name)}
                    from the warband? This
                    cannot be undone.
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="performDeleteFighter('${escapeAttribute(fighter.id)}')"
                >
                    Remove
                </button>

            </div>

        </div>

    `);

}


/*
 * Actually removes a fighter from the database and refunds
 * their base cost against the warband's treasury. Called once
 * a removal is truly confirmed - either immediately, or after
 * "Save Anyway" on the rule-violation warning. Returns false
 * (and leaves the database untouched) if either write fails, so
 * the caller can roll back its optimistic in-memory change.
 */

async function commitFighterDeletion(
    warband,
    fighter
) {

    const {
        error: deleteError
    } =
        await supabaseClient
            .from("fighters")
            .delete()
            .eq(
                "id",
                fighter.id
            );


    if (deleteError) {

        alert(
            "Unable to remove fighter: " +
            deleteError.message
        );

        return false;

    }


    const {
        error: treasuryError
    } =
        await supabaseClient
            .from("warbands")
            .update({

                treasury:
                    warband.treasury,

                stash:
                    warband.stash

            })
            .eq(
                "id",
                warband.id
            );


    if (treasuryError) {

        console.error(
            "Fighter removed but treasury/stash could not be updated:",
            treasuryError.message
        );

    }


    return true;

}


async function performDeleteFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const index =
        warband.fighters.findIndex(
            item =>
                item.id === fighterId
        );


    if (index === -1) {

        return;

    }


    const fighter =
        warband.fighters[index];


    /*
     * Refund the fighter's base cost and
     * remove them from the roster. Their
     * equipment isn't resold for gold (money
     * spent is spent) but moves into the
     * warband's stash rather than vanishing,
     * so it can be handed to someone else later.
     */

    warband.treasury +=
        Number(fighter.baseCost) || 0;


    warband.stash.push(
        ...fighter.equipment
    );


    warband.fighters.splice(
        index,
        1
    );


    const validation =
        validateCurrentWarband(
            warband
        );


    if (validation.errors.length) {

        pendingFighterRemoval = {
            fighter,
            index
        };


        renderFighterRemovalWarning(
            fighter,
            validation
        );

        return;

    }


    const committed =
        await commitFighterDeletion(
            warband,
            fighter
        );


    if (!committed) {

        /*
         * Roll back the optimistic in-memory
         * change - the database write failed.
         */

        warband.treasury -=
            Number(fighter.baseCost) || 0;

        warband.stash.splice(
            warband.stash.length -
                fighter.equipment.length,
            fighter.equipment.length
        );

        warband.fighters.splice(
            index,
            0,
            fighter
        );

        return;

    }


    closeModal();


    renderApplication();

}


function renderFighterRemovalWarning(
    fighter,
    validation
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Rule Violations
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="cancelFighterRemoval()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Removing
                    ${escapeHtml(fighter.name)}
                    creates rule violations:
                </p>


                <ul>

                    ${validation.errors
                        .map(
                            error =>
                                `<li>
                                    ${escapeHtml(error.message)}
                                </li>`
                        )
                        .join("")}

                </ul>


                <p>
                    Save anyway?
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="cancelFighterRemoval()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="confirmFighterRemoval()"
                >
                    Save Anyway
                </button>

            </div>

        </div>

    `);

}


function cancelFighterRemoval() {

    const warband =
        getCurrentWarband();


    if (warband && pendingFighterRemoval) {

        warband.treasury -=
            Number(
                pendingFighterRemoval.fighter.baseCost
            ) || 0;

        warband.stash.splice(
            warband.stash.length -
                pendingFighterRemoval.fighter.equipment.length,
            pendingFighterRemoval.fighter.equipment.length
        );

        warband.fighters.splice(
            pendingFighterRemoval.index,
            0,
            pendingFighterRemoval.fighter
        );

    }


    pendingFighterRemoval = null;


    closeModal();

}


async function confirmFighterRemoval() {

    const warband =
        getCurrentWarband();


    const pending =
        pendingFighterRemoval;


    pendingFighterRemoval = null;


    if (!warband || !pending) {

        closeModal();

        return;

    }


    const committed =
        await commitFighterDeletion(
            warband,
            pending.fighter
        );


    if (!committed) {

        /*
         * Roll back the optimistic in-memory
         * change - the database write failed.
         */

        warband.treasury -=
            Number(pending.fighter.baseCost) || 0;

        warband.stash.splice(
            warband.stash.length -
                pending.fighter.equipment.length,
            pending.fighter.equipment.length
        );

        warband.fighters.splice(
            pending.index,
            0,
            pending.fighter
        );

        closeModal();

        renderApplication();

        return;

    }


    closeModal();


    renderApplication();

}
