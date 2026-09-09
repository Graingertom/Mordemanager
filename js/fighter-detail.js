/* ============================================================
   MORDEMANAGER
   Fighter Detail UI
   ============================================================ */


/* ============================================================
   FIGHTER DETAIL
   ============================================================ */

function showFighterDetails(fighterId) {

    const warband = getCurrentWarband();

    if (!warband) {
        return;
    }

    const fighter = warband.fighters.find(
        item => item.id === fighterId
    );

    if (!fighter) {
        return;
    }

    renderFighterDetailModal(warband, fighter);
}


function renderFighterDetailModal(warband, fighter) {

    const equipment = Array.isArray(fighter.equipment)
        ? fighter.equipment
        : [];

    const skills = Array.isArray(fighter.skills)
        ? fighter.skills
        : [];

    const injuries = Array.isArray(fighter.injuries)
        ? fighter.injuries
        : [];

    const advances = Array.isArray(fighter.advances)
        ? fighter.advances
        : [];

    const definition =
        state.warbandDefinitions[warband.type];

    const fighterType =
        definition?.fighterTypes?.find(
            type => type.id === fighter.type
        );

    const specialRules =
        fighterType?.specialRules || [];

    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(fighter.category)}
                    </span>

                    <h2>
                        ${escapeHtml(fighter.name)}
                    </h2>

                    <p class="mm-muted">
                        ${escapeHtml(fighter.typeName)}
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


                <!-- =========================================
                     PROFILE
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Profile
                    </h3>

                    <div class="mm-profile">

                        ${Object.entries(
                            RulesEngine.calculateEffectiveProfile(fighter)
                        )
                            .map(
                                ([stat, value]) =>
                                    renderStat(stat, value)
                            )
                            .join("")}

                    </div>

                </section>


                <!-- =========================================
                     SPECIAL RULES
                     ========================================= -->

                ${
                    specialRules.length
                        ? `
                            <section class="mm-detail-section">

                                <h3>
                                    Special Rules
                                </h3>

                                ${renderSpecialRules(specialRules)}

                            </section>
                        `
                        : ""
                }


                <!-- =========================================
                     SUMMARY
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Summary
                    </h3>

                    <div class="mm-detail-grid">

                        <div class="mm-rule-stat">

                            <span>
                                Experience
                            </span>

                            <strong>
                                ${fighter.experience || 0}
                            </strong>

                        </div>

                        <div class="mm-rule-stat">

                            <span>
                                Equipment
                            </span>

                            <strong>
                                ${equipment.length}
                            </strong>

                        </div>

                        <div class="mm-rule-stat">

                            <span>
                                Skills
                            </span>

                            <strong>
                                ${skills.length}
                            </strong>

                        </div>

                        <div class="mm-rule-stat">

                            <span>
                                Value
                            </span>

                            <strong>
                                ${calculateFighterCost(fighter)} gc
                            </strong>

                        </div>

                    </div>

                </section>


                <!-- =========================================
                     EQUIPMENT
                     ========================================= -->

                <section class="mm-detail-section">

                    <div class="mm-section-header">

                        <div>

                            <h3>
                                Equipment
                            </h3>

                            <p>
                                Click equipment to view its rules.
                            </p>

                        </div>

                    </div>

                    ${
                        equipment.length

                            ? `
                                <div class="mm-detail-list">

                                    ${equipment
                                        .map(
                                            renderFighterEquipmentDetail
                                        )
                                        .join("")}

                                </div>
                            `

                            : `
                                <p class="mm-muted">
                                    No equipment.
                                </p>
                            `
                    }

                </section>


                <!-- =========================================
                     SKILLS
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Skills
                    </h3>

                    ${
                        skills.length

                            ? `
                                <div class="mm-trait-list">

                                    ${skills
                                        .map(renderSkillTag)
                                        .join("")}

                                </div>
                            `

                            : `
                                <p class="mm-muted">
                                    No skills recorded.
                                </p>
                            `
                    }

                </section>


                <!-- =========================================
                     INJURIES
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Injuries
                    </h3>

                    ${
                        injuries.length

                            ? `
                                <div class="mm-detail-list">

                                    ${injuries
                                        .map(renderFighterInjury)
                                        .join("")}

                                </div>
                            `

                            : `
                                <p class="mm-muted">
                                    No injuries.
                                </p>
                            `
                    }

                </section>


                <!-- =========================================
                     ADVANCES
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Advances
                    </h3>

                    ${
                        advances.length

                            ? `
                                <div class="mm-detail-list">

                                    ${advances
                                        .map(renderFighterAdvance)
                                        .join("")}

                                </div>
                            `

                            : `
                                <p class="mm-muted">
                                    No advances recorded.
                                </p>
                            `
                    }

                </section>


                <!-- =========================================
                     NOTES
                     ========================================= -->

                <section class="mm-detail-section">

                    <h3>
                        Notes
                    </h3>

                    <div class="mm-notes-display">

                        ${
                            fighter.notes
                                ? escapeHtml(fighter.notes)
                                : `
                                    <span class="mm-muted">
                                        No notes recorded.
                                    </span>
                                `
                        }

                    </div>

                </section>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Close
                </button>

                <button
                    class="mm-button mm-button-primary"
                    onclick="
                        closeModal();
                        showEditFighter('${fighter.id}');
                    "
                >
                    Edit Fighter
                </button>

            </div>

        </div>

    `);
}


/* ============================================================
   EQUIPMENT
   ============================================================ */

function renderFighterEquipmentDetail(equipmentId) {

    const item = getEquipment(equipmentId);

    if (!item) {

        return `

            <div class="mm-detail-row">

                <strong>
                    ${escapeHtml(equipmentId)}
                </strong>

                <span class="mm-muted">
                    Unknown equipment
                </span>

            </div>

        `;
    }

    const traits = Array.isArray(item.traits)
        ? item.traits
        : [];

    return `

        <button
            type="button"
            class="mm-detail-row mm-detail-row-button"
            onclick="
                showEquipment(
                    '${escapeAttribute(item.id)}'
                )
            "
        >

            <div>

                <strong>
                    ${escapeHtml(item.name)}
                </strong>

                ${
                    traits.length
                        ? `
                            <div class="mm-trait-list">

                                ${traits
                                    .map(renderTraitButton)
                                    .join("")}

                            </div>
                        `
                        : ""
                }

            </div>

            <span>
                ${item.cost ?? 0} gc
            </span>

        </button>

    `;
}


/* ============================================================
   INJURIES
   ============================================================ */

function renderFighterInjury(injury) {

    if (typeof injury === "string") {

        return `

            <div class="mm-detail-row">

                <strong>
                    ${escapeHtml(injury)}
                </strong>

            </div>

        `;
    }

    return `

        <div class="mm-detail-row">

            <div>

                <strong>
                    ${escapeHtml(
                        injury.name ||
                        injury.type ||
                        "Injury"
                    )}
                </strong>

                ${
                    injury.description
                        ? `
                            <p class="mm-muted">
                                ${escapeHtml(
                                    injury.description
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

            ${
                injury.date
                    ? `
                        <span>
                            ${formatDate(injury.date)}
                        </span>
                    `
                    : ""
            }

        </div>

    `;
}


/* ============================================================
   ADVANCES
   ============================================================ */

function renderFighterAdvance(advance) {

    if (typeof advance === "string") {

        return `

            <div class="mm-detail-row">

                <strong>
                    ${escapeHtml(advance)}
                </strong>

            </div>

        `;
    }

    return `

        <div class="mm-detail-row">

            <div>

                <strong>
                    ${escapeHtml(
                        advance.name ||
                        advance.type ||
                        "Advance"
                    )}
                </strong>

                ${
                    advance.description
                        ? `
                            <p class="mm-muted">
                                ${escapeHtml(
                                    advance.description
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

            ${
                advance.xp
                    ? `
                        <span>
                            +${escapeHtml(advance.xp)} XP
                        </span>
                    `
                    : ""
            }

        </div>

    `;
}


/* ============================================================
   SKILLS
   ============================================================ */

async function addFighterSkill(fighterId, skillId) {

    const warband = getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item => item.id === fighterId
        );

    if (!fighter) {
        return;
    }

    if (!Array.isArray(fighter.skills)) {
        fighter.skills = [];
    }

    if (fighter.skills.includes(skillId)) {
        return;
    }

    const previousSkills =
        [...fighter.skills];

    fighter.skills.push(skillId);

    const { error } =
        await supabaseClient
            .from("fighters")
            .update({ skills: fighter.skills })
            .eq("id", fighter.id);

    if (error) {
        alert("Unable to save skill: " + error.message);
        fighter.skills = previousSkills;
        return;
    }

    renderApplication();
}


async function removeFighterSkill(fighterId, skillId) {

    const warband = getCurrentWarband();

    const fighter =
        warband?.fighters.find(
            item => item.id === fighterId
        );

    if (!fighter) {
        return;
    }

    const previousSkills =
        [...(fighter.skills || [])];

    fighter.skills =
        (fighter.skills || [])
            .filter(
                id => id !== skillId
            );

    const { error } =
        await supabaseClient
            .from("fighters")
            .update({ skills: fighter.skills })
            .eq("id", fighter.id);

    if (error) {
        alert("Unable to remove skill: " + error.message);
        fighter.skills = previousSkills;
        return;
    }

    renderApplication();
}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManagerFighters = {

    showFighterDetails,

    renderFighterDetailModal,

    addFighterSkill,

    removeFighterSkill

};


/*
 * Global functions are deliberately exposed because
 * the current application uses inline onclick handlers.
 */

window.showFighterDetails =
    showFighterDetails;

window.addFighterSkill =
    addFighterSkill;

window.removeFighterSkill =
    removeFighterSkill;
