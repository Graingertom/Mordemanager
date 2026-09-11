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


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseFighter(
    fighter,
    index
) {

    const typeId =
        fighter.type ||
        fighter.fighterType ||
        fighter.typeId;


    /*
     * At the moment Reikland is the only
     * implemented warband definition.
     */

    const definition =
        state.warbandDefinitions.reikland;


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
            currentWarband.fighters.length
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


    const heroes =
        warband.fighters.filter(
            fighter =>
                fighter.category ===
                "hero"
        );


    const henchmen =
        warband.fighters.filter(
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

                    <button
                        class="mm-button mm-button-small"
                        onclick="showEditFighter('${escapeAttribute(fighter.id)}')"
                    >
                        Edit
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
                                        renderInjuryTag(
                                            typeof injury === "string"
                                                ? injury
                                                : injury.id
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


    const availableEquipment =
        getAvailableEquipment(
            fighterType
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
                            fighter.equipment
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
                        Advance
                    </h3>


                    <div id="fighter-advance-section">

                        ${renderAdvanceSection(
                            fighter
                        )}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Injuries
                    </h3>

                    <p>
                        Record what happened to this
                        fighter after this game.
                    </p>


                    <div id="fighter-injuries-list">

                        ${renderInjuriesEditorList()}

                    </div>


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


                    <label class="mm-field">

                        <span>
                            Experience
                        </span>


                        <input
                            id="fighter-game-xp"
                            type="number"
                            min="0"
                            value="${fighter.experience || 0}"
                        >

                    </label>

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
                    selectedEquipment
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
    injuryId
) {

    const injury =
        RulesEngine.findInjury(
            injuryId,
            state.injuries
        );


    if (!injury) {

        return `

            <span class="mm-equipment-tag">
                ${escapeHtml(injuryId)}
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
                    fighter.equipment

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
                    fighter.advances

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
    equipmentIds
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


    const totalCost =
        baseCost + equipmentCost;


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
    fighterType
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
        state.warbandDefinitions.reikland;


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
