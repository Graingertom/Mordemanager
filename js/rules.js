/* ============================================================
   MORDEMANAGER - RULES ENGINE
   ============================================================ */

const RulesEngine = (() => {


/* ============================================================
   VALIDATE COMPLETE WARBAND
   ============================================================ */

function validateWarband(
    warband,
    definition,
    equipmentData
) {

    const result = {
        valid: true,
        errors: [],
        warnings: [],
        info: []
    };


    /* --------------------------------------------------------
       BASIC WARBAND CHECK
       -------------------------------------------------------- */

    if (!warband) {

        result.errors.push({

            code: "NO_WARBAND",

            message:
                "No warband was supplied."

        });

        result.valid = false;

        return result;

    }


    const fighters =
        Array.isArray(warband.fighters)
            ? warband.fighters
            : [];


    /* --------------------------------------------------------
       WARBAND SIZE
       -------------------------------------------------------- */

    validateWarbandSize(
        fighters,
        definition,
        result
    );


    /* --------------------------------------------------------
       FIGHTER TYPES
       -------------------------------------------------------- */

    validateFighterTypes(
        fighters,
        definition,
        result
    );


    /* --------------------------------------------------------
       INDIVIDUAL FIGHTERS
       -------------------------------------------------------- */

    fighters.forEach(
        fighter => {

            validateFighter(
                fighter,
                definition,
                equipmentData,
                result
            );

        }
    );


    /* --------------------------------------------------------
       TREASURY
       -------------------------------------------------------- */

    validateTreasury(
        warband,
        result
    );


    /* --------------------------------------------------------
       EMPTY WARBAND
       -------------------------------------------------------- */

    if (fighters.length === 0) {

        result.warnings.push({

            code: "EMPTY_WARBAND",

            message:
                "Your warband contains no fighters."

        });

    }


    result.valid =
        result.errors.length === 0;


    return result;

}


/* ============================================================
   VALIDATION SUMMARY
   ============================================================ */

function getValidationSummary(
    validation
) {

    if (!validation) {

        return {

            status: "invalid",

            label: "Invalid"

        };

    }


    if (
        validation.errors &&
        validation.errors.length > 0
    ) {

        return {

            status: "invalid",

            label:
                `${validation.errors.length} rule issue` +
                (
                    validation.errors.length === 1
                        ? ""
                        : "s"
                )

        };

    }


    if (
        validation.warnings &&
        validation.warnings.length > 0
    ) {

        return {

            status: "warning",

            label:
                `${validation.warnings.length} warning` +
                (
                    validation.warnings.length === 1
                        ? ""
                        : "s"
                )

        };

    }


    return {

        status: "valid",

        label: "Valid"

    };

}


/* ============================================================
   WARBAND SIZE
   ============================================================ */

function validateWarbandSize(
    fighters,
    definition,
    result
) {

    const minimum =
        Number(
            definition?.minimumWarbandSize
        );


    const maximum =
        Number(
            definition?.maximumWarbandSize
        );


    if (
        Number.isFinite(minimum) &&
        fighters.length < minimum
    ) {

        result.errors.push({

            code: "MIN_WARBAND_SIZE",

            message:
                `Your warband contains ${fighters.length} fighters, ` +
                `but the minimum is ${minimum}.`

        });

    }


    if (
        Number.isFinite(maximum) &&
        fighters.length > maximum
    ) {

        result.errors.push({

            code: "MAX_WARBAND_SIZE",

            message:
                `Your warband contains ${fighters.length} fighters, ` +
                `but the maximum is ${maximum}.`

        });

    }

}


/* ============================================================
   FIGHTER TYPES
   ============================================================ */

function validateFighterTypes(
    fighters,
    definition,
    result
) {

    const fighterTypes =
        Array.isArray(
            definition?.fighterTypes
        )
            ? definition.fighterTypes
            : [];


    fighterTypes.forEach(
        type => {

            const count =
                fighters.filter(
                    fighter =>
                        fighter.type === type.id
                ).length;


            const minimum =
                Number(type.min);


            const maximum =
                type.max === null ||
                type.max === undefined ||
                type.max === ""
                    ? Infinity
                    : Number(type.max);


            /* ------------------------------------------------
               MINIMUM
               ------------------------------------------------ */

            if (
                Number.isFinite(minimum) &&
                count < minimum
            ) {

                result.errors.push({

                    code:
                        `MIN_${type.id.toUpperCase()}`,

                    message:
                        `${type.name}: you need at least ` +
                        `${minimum}, but currently have ${count}.`

                });

            }


            /* ------------------------------------------------
               MAXIMUM
               ------------------------------------------------ */

            if (
                Number.isFinite(maximum) &&
                count > maximum
            ) {

                result.errors.push({

                    code:
                        `MAX_${type.id.toUpperCase()}`,

                    message:
                        `${type.name}: you can have a maximum of ` +
                        `${maximum}, but currently have ${count}.`

                });

            }

        }
    );

}


/* ============================================================
   INDIVIDUAL FIGHTER
   ============================================================ */

function validateFighter(
    fighter,
    definition,
    equipmentData,
    result = null
) {

    const ownResult =
        result || {

            valid: true,
            errors: [],
            warnings: [],
            info: []

        };


    if (!fighter) {

        ownResult.errors.push({

            code: "NO_FIGHTER",

            message:
                "No fighter was supplied."

        });

        ownResult.valid = false;

        return ownResult;

    }


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        );


    if (!fighterType) {

        ownResult.errors.push({

            code: "UNKNOWN_FIGHTER_TYPE",

            message:
                `${fighter.name || "Unnamed fighter"} ` +
                `has an unknown fighter type.`

        });

        ownResult.valid = false;

        return ownResult;

    }


    /* --------------------------------------------------------
       NAME
       -------------------------------------------------------- */

    if (
        !fighter.name ||
        !String(fighter.name).trim()
    ) {

        ownResult.errors.push({

            code: "MISSING_FIGHTER_NAME",

            message:
                `${fighterType.name} does not have a name.`

        });

    }


    /* --------------------------------------------------------
       PROFILE
       -------------------------------------------------------- */

    validateProfile(
        fighter,
        fighterType,
        ownResult
    );


    /* --------------------------------------------------------
       EQUIPMENT
       -------------------------------------------------------- */

    validateEquipment(
        fighter,
        fighterType,
        definition,
        equipmentData,
        ownResult
    );


    ownResult.valid =
        ownResult.errors.length === 0;


    return ownResult;

}


/* ============================================================
   PROFILE
   ============================================================ */

function validateProfile(
    fighter,
    fighterType,
    result
) {

    if (!fighter.profile) {

        result.errors.push({

            code: "MISSING_PROFILE",

            message:
                `${fighter.name || fighterType.name} ` +
                `is missing a profile.`

        });

        return;

    }


    const requiredStats = [

        "M",
        "WS",
        "BS",
        "S",
        "T",
        "W",
        "I",
        "A",
        "Ld"

    ];


    requiredStats.forEach(
        stat => {

            if (
                fighter.profile[stat] === undefined ||
                fighter.profile[stat] === null
            ) {

                result.errors.push({

                    code: "MISSING_STAT",

                    message:
                        `${fighter.name || fighterType.name} ` +
                        `is missing the ${stat} characteristic.`

                });

            }

        }
    );

}


/* ============================================================
   EQUIPMENT VALIDATION
   ============================================================ */

function validateEquipment(
    fighter,
    fighterType,
    definition,
    equipmentData,
    result
) {

    const equipment =
        Array.isArray(fighter?.equipment)
            ? fighter.equipment
            : [];


    /* --------------------------------------------------------
       RESOLVE ALLOWED EQUIPMENT
       -------------------------------------------------------- */

    const allowedEquipment =
        getEquipmentListForFighter(
            fighterType,
            definition
        );


    const allowedSet =
        new Set(
            allowedEquipment
        );


    /* --------------------------------------------------------
       VALIDATE EACH ITEM
       -------------------------------------------------------- */

    equipment.forEach(
        equipmentId => {

            const item =
                findEquipment(
                    equipmentId,
                    equipmentData
                );


            /* ------------------------------------------------
               UNKNOWN EQUIPMENT
               ------------------------------------------------ */

            if (!item) {

                result.errors.push({

                    code: "UNKNOWN_EQUIPMENT",

                    message:
                        `${fighter.name || "Fighter"} has unknown ` +
                        `equipment: ${equipmentId}.`

                });

                return;

            }


            /* ------------------------------------------------
               ILLEGAL EQUIPMENT
               ------------------------------------------------ */

            if (
                !allowedSet.has(item.id)
            ) {

                result.errors.push({

                    code: "ILLEGAL_EQUIPMENT",

                    message:
                        `${fighter.name || "Fighter"} cannot take ` +
                        `${item.name}.`

                });

            }

        }
    );


    /* --------------------------------------------------------
       DUPLICATES
       -------------------------------------------------------- */

    const uniqueEquipment =
        new Set(equipment);


    if (
        uniqueEquipment.size !==
        equipment.length
    ) {

        result.errors.push({

            code: "DUPLICATE_EQUIPMENT",

            message:
                `${fighter.name || "Fighter"} has duplicate ` +
                `equipment selected.`

        });

    }

}


/* ============================================================
   EQUIPMENT LIST RESOLUTION
   ============================================================ */

function getEquipmentListForFighter(
    fighterType,
    definition
) {

    if (!fighterType) {

        return [];

    }


    /* --------------------------------------------------------
       NAMED EQUIPMENT LIST
       -------------------------------------------------------- */

    if (
        typeof fighterType.equipmentList === "string" &&
        definition?.equipmentLists
    ) {

        const equipmentList =
            definition.equipmentLists[
                fighterType.equipmentList
            ];


        if (equipmentList) {

            return [

                ...(equipmentList.closeCombat || []),

                ...(equipmentList.missile || []),

                ...(equipmentList.armour || []),

                ...(equipmentList.miscellaneous || []),

                ...(equipmentList.misc || []),

                ...(equipmentList.special || [])

            ];

        }

    }


    /* --------------------------------------------------------
       DIRECT EQUIPMENT ARRAY
       -------------------------------------------------------- */

    if (
        Array.isArray(
            fighterType.equipment
        )
    ) {

        return [
            ...fighterType.equipment
        ];

    }


    /* --------------------------------------------------------
       ALLOWED EQUIPMENT ARRAY
       -------------------------------------------------------- */

    if (
        Array.isArray(
            fighterType.allowedEquipment
        )
    ) {

        return [
            ...fighterType.allowedEquipment
        ];

    }


    return [];

}


/* ============================================================
   FIND EQUIPMENT
   ============================================================ */

function findEquipment(
    equipmentId,
    equipmentData
) {

    if (
        !equipmentId ||
        !equipmentData
    ) {

        return null;

    }


    /* --------------------------------------------------------
       NORMAL STRUCTURE
       
       {
           equipment: [...]
       }
       -------------------------------------------------------- */

    if (
        Array.isArray(
            equipmentData.equipment
        )
    ) {

        return equipmentData.equipment.find(
            item =>
                item.id === equipmentId
        ) || null;

    }


    /* --------------------------------------------------------
       OBJECT STRUCTURE
       
       {
           items: {
               dagger: {...}
           }
       }
       -------------------------------------------------------- */

    if (
        equipmentData.items &&
        typeof equipmentData.items === "object"
    ) {

        return equipmentData.items[
            equipmentId
        ] || null;

    }


    /* --------------------------------------------------------
       DIRECT ARRAY
       -------------------------------------------------------- */

    if (
        Array.isArray(equipmentData)
    ) {

        return equipmentData.find(
            item =>
                item.id === equipmentId
        ) || null;

    }


    return null;

}


/* ============================================================
   EQUIPMENT COST
   ============================================================ */

function calculateEquipmentCost(
    equipment,
    equipmentData
) {

    if (
        !Array.isArray(equipment)
    ) {

        return 0;

    }


    return equipment.reduce(
        (
            total,
            equipmentId
        ) => {

            const item =
                findEquipment(
                    equipmentId,
                    equipmentData
                );


            return total +
                (
                    Number(
                        item?.cost
                    ) || 0
                );

        },
        0
    );

}


/* ============================================================
   FIGHTER COST
   ============================================================ */

function calculateFighterCost(
    fighter,
    equipmentData
) {

    if (!fighter) {

        return 0;

    }


    const baseCost =
        Number(
            fighter.baseCost ??
            fighter.cost
        ) || 0;


    return (
        baseCost +
        calculateEquipmentCost(
            fighter.equipment,
            equipmentData
        )
    );

}


/* ============================================================
   WARBAND VALUE
   ============================================================ */

function calculateWarbandValue(
    warband,
    equipmentData
) {

    const fighters =
        Array.isArray(
            warband?.fighters
        )
            ? warband.fighters
            : [];


    const fighterValue =
        fighters.reduce(
            (
                total,
                fighter
            ) => {

                return total +
                    calculateFighterCost(
                        fighter,
                        equipmentData
                    );

            },
            0
        );


    const stash =
        Array.isArray(
            warband?.stash
        )
            ? warband.stash
            : [];


    const stashValue =
        calculateEquipmentCost(
            stash,
            equipmentData
        );


    return fighterValue +
        stashValue;

}


/* ============================================================
   EXPERIENCE
   ============================================================ */

function calculateExperience(
    warband
) {

    const fighters =
        Array.isArray(
            warband?.fighters
        )
            ? warband.fighters
            : [];


    return fighters.reduce(
        (
            total,
            fighter
        ) => {

            return total +
                (
                    Number(
                        fighter.experience
                    ) || 0
                );

        },
        0
    );

}


/* ============================================================
   WARBAND RATING
   ============================================================ */

function calculateWarbandRating(
    warband,
    equipmentData
) {

    return (
        calculateWarbandValue(
            warband,
            equipmentData
        ) +
        calculateExperience(
            warband
        )
    );

}


/* ============================================================
   TREASURY
   ============================================================ */

function validateTreasury(
    warband,
    result = null
) {

    const ownResult =
        result || {

            valid: true,
            errors: [],
            warnings: [],
            info: []

        };


    const treasury =
        Number(
            warband?.treasury
        );


    if (
        !Number.isFinite(
            treasury
        )
    ) {

        ownResult.errors.push({

            code: "INVALID_TREASURY",

            message:
                "Warband treasury is invalid."

        });

    } else if (
        treasury < 0
    ) {

        ownResult.errors.push({

            code: "NEGATIVE_TREASURY",

            message:
                "Your warband cannot have a negative treasury."

        });

    }


    ownResult.valid =
        ownResult.errors.length === 0;


    return ownResult;

}


/* ============================================================
   EQUIPMENT PURCHASE VALIDATION
   ============================================================ */

function validateEquipmentPurchase(
    warband,
    fighter,
    equipmentId,
    definition,
    equipmentData
) {

    const result = {

        valid: true,

        errors: [],

        warnings: [],

        info: []

    };


    if (!warband) {

        result.errors.push({

            code: "NO_WARBAND",

            message:
                "No warband was supplied."

        });

    }


    if (!fighter) {

        result.errors.push({

            code: "NO_FIGHTER",

            message:
                "No fighter was supplied."

        });

    }


    if (result.errors.length) {

        result.valid = false;

        return result;

    }


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        );


    if (!fighterType) {

        result.errors.push({

            code: "UNKNOWN_FIGHTER_TYPE",

            message:
                "The fighter type could not be found."

        });

        result.valid = false;

        return result;

    }


    const item =
        findEquipment(
            equipmentId,
            equipmentData
        );


    if (!item) {

        result.errors.push({

            code: "UNKNOWN_EQUIPMENT",

            message:
                `Equipment '${equipmentId}' could not be found.`

        });

        result.valid = false;

        return result;

    }


    /* --------------------------------------------------------
       EQUIPMENT PERMISSION
       -------------------------------------------------------- */

    const allowedEquipment =
        getEquipmentListForFighter(
            fighterType,
            definition
        );


    if (
        !allowedEquipment.includes(
            equipmentId
        )
    ) {

        result.errors.push({

            code: "ILLEGAL_EQUIPMENT",

            message:
                `${fighter.name || "Fighter"} cannot take ` +
                `${item.name}.`

        });

    }


    /* --------------------------------------------------------
       ALREADY EQUIPPED
       -------------------------------------------------------- */

    const currentEquipment =
        Array.isArray(
            fighter.equipment
        )
            ? fighter.equipment
            : [];


    if (
        currentEquipment.includes(
            equipmentId
        )
    ) {

        result.errors.push({

            code: "ALREADY_EQUIPPED",

            message:
                `${fighter.name || "Fighter"} already has ` +
                `${item.name}.`

        });

    }


    /* --------------------------------------------------------
       COST
       -------------------------------------------------------- */

    const cost =
        Number(item.cost) || 0;


    const treasury =
        Number(
            warband.treasury
        );


    if (
        !Number.isFinite(
            treasury
        )
    ) {

        result.errors.push({

            code: "INVALID_TREASURY",

            message:
                "Warband treasury is invalid."

        });

    } else if (
        treasury < cost
    ) {

        result.errors.push({

            code: "INSUFFICIENT_TREASURY",

            message:
                `Your warband needs ${cost} gc for ` +
                `${item.name}, but only has ${treasury} gc.`

        });

    }


    result.info.push({

        code: "EQUIPMENT_COST",

        equipmentId,

        cost

    });


    result.valid =
        result.errors.length === 0;


    return result;

}


/* ============================================================
   EQUIPMENT CHANGE VALIDATION
   ============================================================ */

function validateEquipmentChange(
    warband,
    fighter,
    newEquipment,
    definition,
    equipmentData
) {

    const result = {

        valid: true,

        errors: [],

        warnings: [],

        info: []

    };


    if (!warband) {

        result.errors.push({

            code: "NO_WARBAND",

            message:
                "No warband was supplied."

        });

    }


    if (!fighter) {

        result.errors.push({

            code: "NO_FIGHTER",

            message:
                "No fighter was supplied."

        });

    }


    if (result.errors.length) {

        result.valid = false;

        return result;

    }


    const requestedEquipment =
        Array.isArray(
            newEquipment
        )
            ? newEquipment
            : [];


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        );


    if (!fighterType) {

        result.errors.push({

            code: "UNKNOWN_FIGHTER_TYPE",

            message:
                `${fighter.name || "Fighter"} ` +
                `has an unknown fighter type.`

        });

        result.valid = false;

        return result;

    }


    /* --------------------------------------------------------
       DUPLICATES
       -------------------------------------------------------- */

    const uniqueEquipment =
        [
            ...new Set(
                requestedEquipment
            )
        ];


    if (
        uniqueEquipment.length !==
        requestedEquipment.length
    ) {

        result.errors.push({

            code: "DUPLICATE_EQUIPMENT",

            message:
                `${fighter.name || "Fighter"} has duplicate ` +
                `equipment selected.`

        });

    }


    /* --------------------------------------------------------
       ALLOWED EQUIPMENT
       -------------------------------------------------------- */

    const allowedEquipment =
        getEquipmentListForFighter(
            fighterType,
            definition
        );


    /* --------------------------------------------------------
       VALIDATE EVERY ITEM
       -------------------------------------------------------- */

    uniqueEquipment.forEach(
        equipmentId => {

            const item =
                findEquipment(
                    equipmentId,
                    equipmentData
                );


            if (!item) {

                result.errors.push({

                    code: "UNKNOWN_EQUIPMENT",

                    message:
                        `${fighter.name || "Fighter"} has unknown ` +
                        `equipment: ${equipmentId}.`

                });

                return;

            }


            if (
                !allowedEquipment.includes(
                    equipmentId
                )
            ) {

                result.errors.push({

                    code: "ILLEGAL_EQUIPMENT",

                    message:
                        `${fighter.name || "Fighter"} cannot take ` +
                        `${item.name}.`

                });

            }

        }
    );


    /* --------------------------------------------------------
       COST DIFFERENCE
       -------------------------------------------------------- */

    const oldEquipment =
        Array.isArray(
            fighter.equipment
        )
            ? fighter.equipment
            : [];


    const oldSet =
        new Set(
            oldEquipment
        );


    const added =
        uniqueEquipment.filter(
            id =>
                !oldSet.has(id)
        );


    const removed =
        oldEquipment.filter(
            id =>
                !uniqueEquipment.includes(id)
        );


    /*
     * Items available in the warband's stash are
     * already paid for - equipping one is free and
     * consumes it from the stash, rather than being
     * bought again at full price.
     */

    const stash =
        Array.isArray(
            warband.stash
        )
            ? [...warband.stash]
            : [];


    const addedFromStash = [];

    const addedPurchased = [];


    added.forEach(
        id => {

            const stashIndex =
                stash.indexOf(id);


            if (stashIndex !== -1) {

                stash.splice(
                    stashIndex,
                    1
                );

                addedFromStash.push(id);

            } else {

                addedPurchased.push(id);

            }

        }
    );


    const addedCost =
        calculateEquipmentCost(
            addedPurchased,
            equipmentData
        );


    const removedValue =
        calculateEquipmentCost(
            removed,
            equipmentData
        );


    const netCost =
        addedCost -
        removedValue;


    const treasury =
        Number(
            warband.treasury
        );


    if (
        !Number.isFinite(
            treasury
        )
    ) {

        result.errors.push({

            code: "INVALID_TREASURY",

            message:
                "Warband treasury is invalid."

        });

    } else if (
        netCost > treasury
    ) {

        result.errors.push({

            code: "INSUFFICIENT_TREASURY",

            message:
                `This equipment change requires ${netCost} gc, ` +
                `but your warband only has ${treasury} gc.`

        });

    }


    result.info.push({

        code: "EQUIPMENT_CHANGE",

        added,

        removed,

        addedFromStash,

        addedPurchased,

        addedCost,

        removedValue,

        netCost

    });


    result.valid =
        result.errors.length === 0;


    return result;

}


/* ============================================================
   APPLY EQUIPMENT CHANGE
   ============================================================ */

function applyEquipmentChange(
    warband,
    fighter,
    newEquipment,
    definition,
    equipmentData
) {

    const validation =
        validateEquipmentChange(
            warband,
            fighter,
            newEquipment,
            definition,
            equipmentData
        );


    if (!validation.valid) {

        const error =
            new Error(
                validation.errors
                    .map(
                        item =>
                            item.message
                    )
                    .join(" ")
            );


        error.validation =
            validation;


        throw error;

    }


    const change =
        validation.info.find(
            item =>
                item.code ===
                "EQUIPMENT_CHANGE"
        );


    const netCost =
        Number(
            change?.netCost
        ) || 0;


    const treasury =
        Number(
            warband.treasury
        );


    /* --------------------------------------------------------
       APPLY TREASURY CHANGE
       -------------------------------------------------------- */

    warband.treasury =
        treasury -
        netCost;


    /* --------------------------------------------------------
       CONSUME STASH ITEMS
       -------------------------------------------------------- */

    if (
        Array.isArray(
            warband.stash
        )
    ) {

        (change?.addedFromStash || []).forEach(
            id => {

                const stashIndex =
                    warband.stash.indexOf(id);


                if (stashIndex !== -1) {

                    warband.stash.splice(
                        stashIndex,
                        1
                    );

                }

            }
        );

    }


    /* --------------------------------------------------------
       APPLY EQUIPMENT
       -------------------------------------------------------- */

    fighter.equipment =
        [
            ...new Set(
                Array.isArray(
                    newEquipment
                )
                    ? newEquipment
                    : []
            )
        ];


    return {

        fighter,

        warband,

        validation,

        cost: netCost

    };

}


/* ============================================================
   PUBLIC SURFACE
   ============================================================ */

return {

    validateWarband,

    getValidationSummary,

    validateFighter,

    validateEquipment,

    validateEquipmentPurchase,

    validateEquipmentChange,

    applyEquipmentChange,

    calculateEquipmentCost,

    calculateFighterCost,

    calculateWarbandValue,

    calculateExperience,

    calculateWarbandRating,

    validateTreasury,

    findEquipment,

    getEquipmentListForFighter

};

})();
