/* ============================================================
   MORDEMANAGER
   Equipment & Traits
   ============================================================ */


/* ============================================================
   GET EQUIPMENT
   ============================================================ */

function getEquipment(id) {

    if (!id) {

        return null;

    }


    const equipment =
        state.equipment;


    if (!equipment) {

        return null;

    }


    /*
     * Current structure:
     *
     * equipment.json
     * {
     *     "equipment": [...]
     * }
     */

    if (
        Array.isArray(
            equipment.equipment
        )
    ) {

        return equipment.equipment.find(
            item =>
                item.id === id
        ) || null;

    }


    /*
     * Also support a future direct
     * object structure.
     */

    if (
        equipment.items &&
        typeof equipment.items === "object"
    ) {

        return equipment.items[id] || null;

    }


    return null;

}


/* ============================================================
   GET TRAIT
   ============================================================ */

function getTrait(id) {

    if (!id) {

        return null;

    }


    return state.equipment
        ?.traits
        ?.[id]
        || null;

}


/* ============================================================
   RENDER EQUIPMENT TAG
   ============================================================ */

function renderEquipmentTag(
    equipmentId
) {

    const item =
        getEquipment(equipmentId);


    if (!item) {

        return `

            <span class="mm-equipment-tag">

                ${escapeHtml(
                    equipmentId
                )}

            </span>

        `;

    }


    const hasTraits =
        Array.isArray(item.traits) &&
        item.traits.length > 0;


    return `

        <button
            class="mm-equipment-tag"
            onclick="
                showEquipment(
                    '${escapeAttribute(item.id)}'
                )
            "
        >

            ${escapeHtml(
                item.name
            )}

            ${
                hasTraits

                ?

                `
                    <span class="mm-trait-dot">
                        ●
                    </span>
                `

                :

                ""
            }

        </button>

    `;

}


/* ============================================================
   EQUIPMENT MODAL
   ============================================================ */

function showEquipment(
    id
) {

    const item =
        getEquipment(id);


    if (!item) {

        return;

    }


    const traits =
        Array.isArray(item.traits)
            ? item.traits
            : [];


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

                    <span class="mm-badge">

                        ${escapeHtml(
                            item.category ||
                            "Equipment"
                        )}

                    </span>

                    <h2>

                        ${escapeHtml(
                            item.name
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

                <div class="mm-rule-stat">

                    <span>
                        Cost
                    </span>

                    <strong>
                        ${Number(item.cost) || 0} gc
                    </strong>

                </div>


                <div class="mm-rule-stat">

                    <span>
                        Availability
                    </span>

                    <strong>
                        ${escapeHtml(
                            item.availability ||
                            "Unknown"
                        )}
                    </strong>

                </div>


                ${
                    item.weaponProfile

                    ?

                    `
                        <div class="mm-rule-stat">

                            <span>
                                Range
                            </span>

                            <strong>
                                ${escapeHtml(
                                    item.weaponProfile.range || "-"
                                )}
                            </strong>

                        </div>


                        <div class="mm-rule-stat">

                            <span>
                                Strength
                            </span>

                            <strong>
                                ${escapeHtml(
                                    item.weaponProfile.strength || "-"
                                )}
                            </strong>

                        </div>


                        ${
                            item.weaponProfile.special

                            ?

                            `
                                <div class="mm-rule-block">

                                    <h3>
                                        Special Rules
                                    </h3>

                                    <p class="mm-rule-description">

                                        ${escapeHtml(
                                            item.weaponProfile.special
                                        )}

                                    </p>

                                </div>
                            `

                            :

                            ""
                        }
                    `

                    :

                    ""
                }


                ${
                    item.description

                    ?

                    `
                        <div class="mm-rule-block">

                            <h3>
                                Description
                            </h3>

                            <p class="mm-rule-description">

                                ${escapeHtml(
                                    item.description
                                )}

                            </p>

                        </div>
                    `

                    :

                    ""
                }


                ${
                    traits.length

                    ?

                    `

                        <div class="mm-rule-block">

                            <h3>
                                Traits
                            </h3>

                            <div class="mm-trait-list">

                                ${traits
                                    .map(
                                        renderTraitButton
                                    )
                                    .join("")}

                            </div>

                        </div>

                    `

                    :

                    ""
                }


                ${renderSourceInformation(item)}

            </div>

        </div>

    `);

}


/* ============================================================
   TRAIT BUTTON
   ============================================================ */

function renderTraitButton(
    traitId
) {

    const trait =
        getTrait(traitId);


    if (!trait) {

        return `

            <span class="mm-trait">

                ${escapeHtml(
                    traitId
                )}

            </span>

        `;

    }


    return `

        <button
            class="mm-trait"
            onclick="
                showTrait(
                    '${escapeAttribute(traitId)}'
                )
            "
        >

            ${escapeHtml(
                trait.name
            )}

        </button>

    `;

}


/* ============================================================
   TRAIT MODAL
   ============================================================ */

function showTrait(
    id
) {

    const trait =
        getTrait(id);


    if (!trait) {

        return;

    }


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

                        ${escapeHtml(
                            trait.name
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

                ${
                    trait.summary

                    ?

                    `
                        <p class="mm-rule-description">

                            ${escapeHtml(
                                trait.summary
                            )}

                        </p>
                    `

                    :

                    ""
                }


                ${
                    trait.description

                    ?

                    `
                        <div class="mm-rule-block">

                            <p class="mm-rule-description">

                                ${escapeHtml(
                                    trait.description
                                )}

                            </p>

                        </div>
                    `

                    :

                    ""
                }


                ${renderSourceInformation(trait)}

            </div>

        </div>

    `);

}


/* ============================================================
   EQUIPMENT COST
   ============================================================ */

function calculateEquipmentCost(
    equipmentIds
) {

    if (!Array.isArray(equipmentIds)) {

        return 0;

    }


    return equipmentIds.reduce(

        (total, id) => {

            const item =
                getEquipment(id);

            return total +
                (Number(item?.cost) || 0);

        },

        0

    );

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManager =
    window.MordeManager || {};


Object.assign(
    window.MordeManager,
    {

        getEquipment,

        getTrait,

        renderEquipmentTag,

        showEquipment,

        renderTraitButton,

        showTrait,

        calculateEquipmentCost

    }
);
