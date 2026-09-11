/* ============================================================
   MORDEMANAGER
   Equipment
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
                    item.armourProfile

                    ?

                    `
                        <div class="mm-rule-stat">

                            <span>
                                Armour Save
                            </span>

                            <strong>
                                ${escapeHtml(
                                    item.armourProfile.save || "-"
                                )}
                            </strong>

                        </div>


                        ${
                            item.armourProfile.special

                            ?

                            `
                                <div class="mm-rule-block">

                                    <h3>
                                        Special Rules
                                    </h3>

                                    <p class="mm-rule-description">

                                        ${escapeHtml(
                                            item.armourProfile.special
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


                ${renderSourceInformation(
                    state.equipment,
                    item.sourcePage
                )}

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

        renderEquipmentTag,

        showEquipment,

        calculateEquipmentCost

    }
);
