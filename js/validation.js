/* ============================================================
   MORDEMANAGER
   Rules Validation
   ============================================================ */


/* ============================================================
   VALIDATION RESULT
   ============================================================ */

function createValidationResult() {

    return {

        valid: true,

        errors: [],

        warnings: [],

        info: []

    };

}


function addValidationError(
    result,
    message,
    fighterId = null
) {

    result.valid = false;

    result.errors.push({

        message,

        fighterId

    });

}


function addValidationWarning(
    result,
    message,
    fighterId = null
) {

    result.warnings.push({

        message,

        fighterId

    });

}


function addValidationInfo(
    result,
    message,
    fighterId = null
) {

    result.info.push({

        message,

        fighterId

    });

}


/* ============================================================
   WARBAND VALIDATION
   ============================================================ */

function validateWarband(warband) {

    const result =
        createValidationResult();


    if (!warband) {

        addValidationError(
            result,
            "No warband was supplied."
        );

        return result;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        addValidationError(
            result,
            `No rules definition exists for warband type "${warband.type}".`
        );

        return result;

    }


    const fighters =
        Array.isArray(warband.fighters)
            ? warband.fighters
            : [];


    /* --------------------------------------------------------
       Maximum warband size
       -------------------------------------------------------- */

    if (
        definition.maximumWarbandSize !== undefined &&
        fighters.length >
        definition.maximumWarbandSize
    ) {

        addValidationError(

            result,

            `Warband contains ${fighters.length} fighters but the maximum is ${definition.maximumWarbandSize}.`

        );

    }


    /* --------------------------------------------------------
       Fighter type restrictions
       -------------------------------------------------------- */

    const fighterTypes =
        definition.fighterTypes || [];


    fighterTypes.forEach(type => {

        const count =
            fighters.filter(
                fighter =>
                    fighter.type === type.id
            ).length;


        if (
            type.min !== null &&
            type.min !== undefined &&
            count < type.min
        ) {

            addValidationWarning(

                result,

                `${type.name}: minimum ${type.min} required; currently ${count}.`

            );

        }


        if (
            type.max !== null &&
            type.max !== undefined &&
            count > type.max
        ) {

            addValidationError(

                result,

                `${type.name}: maximum ${type.max} allowed; currently ${count}.`

            );

        }

    });


    /* --------------------------------------------------------
       Validate individual fighters
       -------------------------------------------------------- */

    fighters.forEach(fighter => {

        validateFighter(
            warband,
            fighter,
            result
        );

    });


    /* --------------------------------------------------------
       Treasury
       -------------------------------------------------------- */

    const treasury =
        Number(warband.treasury);


    if (
        !Number.isFinite(treasury)
    ) {

        addValidationWarning(

            result,

            "Warband treasury is not a valid number."

        );

    }


    if (
        treasury < 0
    ) {

        addValidationWarning(

            result,

            "Warband treasury is below zero."

        );

    }


    return result;

}


/* ============================================================
   FIGHTER VALIDATION
   ============================================================ */

function validateFighter(
    warband,
    fighter,
    result
) {

    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!fighter) {
        return;
    }


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
        );


    if (!fighterType) {

        addValidationError(

            result,

            `Unknown fighter type "${fighter.type}".`,

            fighter.id

        );

        return;

    }


    /* --------------------------------------------------------
       Base cost
       -------------------------------------------------------- */

    if (
        Number(fighter.baseCost) < 0
    ) {

        addValidationError(

            result,

            `${fighter.name}: base cost cannot be negative.`,

            fighter.id

        );

    }


    /* --------------------------------------------------------
       Equipment
       -------------------------------------------------------- */

    validateFighterEquipment(

        warband,

        fighter,

        fighterType,

        result

    );


    /* --------------------------------------------------------
       Experience
       -------------------------------------------------------- */

    if (
        Number(fighter.experience) < 0
    ) {

        addValidationError(

            result,

            `${fighter.name}: experience cannot be negative.`,

            fighter.id

        );

    }


    /* --------------------------------------------------------
       Profile
       -------------------------------------------------------- */

    if (!fighter.profile) {

        addValidationWarning(

            result,

            `${fighter.name}: fighter profile is missing.`,

            fighter.id

        );

    }

}


/* ============================================================
   EQUIPMENT VALIDATION
   ============================================================ */

function validateFighterEquipment(

    warband,

    fighter,

    fighterType,

    result

) {

    const equipment =
        Array.isArray(fighter.equipment)
            ? fighter.equipment
            : [];


    const availableEquipment =
        getAvailableEquipment(
            fighterType
        );


    const availableIds =
        new Set(
            availableEquipment.map(
                item => item.id
            )
        );


    equipment.forEach(
        equipmentId => {

            const item =
                getEquipment(
                    equipmentId
                );


            if (!item) {

                addValidationError(

                    result,

                    `${fighter.name}: unknown equipment "${equipmentId}".`,

                    fighter.id

                );

                return;

            }


            if (
                !availableIds.has(
                    equipmentId
                )
            ) {

                addValidationError(

                    result,

                    `${fighter.name}: ${item.name} is not available to this fighter.`,

                    fighter.id

                );

            }

        }
    );


    /* --------------------------------------------------------
       Duplicate equipment
       -------------------------------------------------------- */

    const counts = {};


    equipment.forEach(
        equipmentId => {

            counts[equipmentId] =
                (counts[equipmentId] || 0) + 1;

        }
    );


    Object.entries(counts).forEach(
        ([equipmentId, count]) => {

            if (count <= 1) {
                return;
            }


            const item =
                getEquipment(
                    equipmentId
                );


            if (!item) {
                return;
            }


            /*
             * Only flag this as a warning for now.
             *
             * The actual duplicate-item rules need to
             * come from the structured rules data.
             */

            addValidationWarning(

                result,

                `${fighter.name}: ${item.name} appears ${count} times. Check the equipment restrictions.`,

                fighter.id

            );

        }
    );

}


/* ============================================================
   QUICK CHECK
   ============================================================ */

function isWarbandValid(warband) {

    const result =
        validateWarband(
            warband
        );


    return result.valid;

}


/* ============================================================
   SUMMARY
   ============================================================ */

function getValidationSummary(warband) {

    const result =
        validateWarband(
            warband
        );


    return {

        valid:
            result.valid,

        errors:
            result.errors.length,

        warnings:
            result.warnings.length,

        info:
            result.info.length

    };

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManagerValidation = {

    validateWarband,

    validateFighter,

    isWarbandValid,

    getValidationSummary

};


window.validateWarband =
    validateWarband;

window.validateFighter =
    validateFighter;

window.isWarbandValid =
    isWarbandValid;
