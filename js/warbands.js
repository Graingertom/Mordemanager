/* ============================================================
   MORDEMANAGER - WARBAND MANAGEMENT
   ============================================================ */

const MordeManager = (() => {


    /* ============================================================
       CREATE WARBAND
       ============================================================ */

    function createWarband(
        name,
        type,
        definition
    ) {

        if (!name || !name.trim()) {

            throw new Error(
                "A warband name is required."
            );

        }


        if (!definition) {

            throw new Error(
                "Warband definition could not be found."
            );

        }


        return {

            id:
                generateId("warband"),

            name:
                name.trim(),

            type,

            createdAt:
                new Date().toISOString(),

            /*
             * Treasury represents actual money currently held.
             */

            treasury:
                Number(
                    definition.startingTreasury
                ) || 0,

            fighters: [],

            games: [],

            campaign: {

                wins: 0,

                losses: 0,

                draws: 0,

                battles: 0

            }

        };

    }


    /* ============================================================
       CREATE FIGHTER
       ============================================================ */

    function createFighter(
        fighterType
    ) {

        if (!fighterType) {

            throw new Error(
                "Fighter type is required."
            );

        }


        return {

            id:
                generateId("fighter"),

            type:
                fighterType.id,

            typeName:
                fighterType.name,

            category:
                fighterType.category,

            name:
                fighterType.name,

            profile: {
                ...(fighterType.profile || {})
            },

            baseCost:
                Number(fighterType.cost) || 0,

            equipment: [],

            skills: [],

            experience: 0,

            injuries: [],

            advances: [],

            status:
                "active"

        };

    }


    /* ============================================================
       ADD FIGHTER
       ============================================================ */

    function addFighter(
        warband,
        fighterType,
        rulesDefinition
    ) {

        if (!warband) {

            throw new Error(
                "Warband is required."
            );

        }


        if (!fighterType) {

            throw new Error(
                "Fighter type is required."
            );

        }


        if (
            !Array.isArray(
                warband.fighters
            )
        ) {

            warband.fighters = [];

        }


        /*
         * Maximum warband size
         */

        const maximum =
            Number(
                rulesDefinition?.maximumWarbandSize
            );


        if (
            Number.isFinite(maximum) &&
            warband.fighters.length >= maximum
        ) {

            throw new Error(
                `A warband cannot contain more than ${maximum} fighters.`
            );

        }


        /*
         * Maximum of this fighter type
         */

        const existing =
            warband.fighters.filter(

                fighter =>
                    fighter.type ===
                    fighterType.id

            ).length;


        const fighterMaximum =
            fighterType.max === null ||
            fighterType.max === undefined

                ? Infinity

                : Number(
                    fighterType.max
                );


        if (
            existing >= fighterMaximum
        ) {

            throw new Error(

                `You cannot have more than ` +
                `${fighterMaximum} ${fighterType.name}.`

            );

        }


        /*
         * Create the fighter.
         */

        const fighter =
            createFighter(
                fighterType
            );


        /*
         * Automatically create a sensible name.
         */

        fighter.name =
            generateFighterName(
                fighterType,
                warband
            );


        /*
         * Check whether the fighter itself can
         * be purchased.
         */

        const cost =
            fighter.baseCost;


        if (
            cost >
            Number(warband.treasury)
        ) {

            throw new Error(

                `You cannot afford ${fighterType.name}. ` +
                `Cost: ${cost} gc, ` +
                `Treasury: ${warband.treasury} gc.`

            );

        }


        /*
         * Deduct the fighter cost.
         */

        warband.treasury -=
            cost;


        warband.fighters.push(
            fighter
        );


        return fighter;

    }


    /* ============================================================
       REMOVE FIGHTER
       ============================================================ */

    function removeFighter(
        warband,
        fighterId
    ) {

        if (!warband) {

            return false;

        }


        const index =
            warband.fighters.findIndex(
                fighter =>
                    fighter.id === fighterId
            );


        if (index === -1) {

            return false;

        }


        const fighter =
            warband.fighters[index];


        /*
         * At this stage we refund the purchase.
         *
         * Later we can distinguish between:
         *
         * - deleting a newly-created fighter
         * - dismissing a campaign fighter
         * - selling equipment
         *
         * so the correct campaign rules can apply.
         */

        const value =
            Number(fighter.baseCost) || 0;


        warband.treasury +=
            value;


        warband.fighters.splice(
            index,
            1
        );


        return true;

    }


    /* ============================================================
       ADD EQUIPMENT
       ============================================================ */

    function addEquipment(
        warband,
        fighter,
        equipment,
        equipmentData
    ) {

        if (!warband || !fighter) {

            throw new Error(
                "Warband and fighter are required."
            );

        }


        if (!equipment) {

            throw new Error(
                "Equipment could not be found."
            );

        }


        const cost =
            Number(equipment.cost) || 0;


        /*
         * Don't allow overspending.
         */

        if (
            cost >
            Number(warband.treasury)
        ) {

            throw new Error(

                `You cannot afford ${equipment.name}. ` +
                `Cost: ${cost} gc, ` +
                `Treasury: ${warband.treasury} gc.`

            );

        }


        /*
         * Prevent accidental duplicate purchases for now.
         *
         * We'll replace this with quantity support shortly.
         */

        if (
            fighter.equipment.includes(
                equipment.id
            )
        ) {

            throw new Error(
                `${fighter.name} already has ${equipment.name}.`
            );

        }


        fighter.equipment.push(
            equipment.id
        );


        warband.treasury -=
            cost;


        return true;

    }


    /* ============================================================
       REMOVE EQUIPMENT
       ============================================================ */

    function removeEquipment(
        warband,
        fighter,
        equipmentId,
        equipmentData
    ) {

        const index =
            fighter.equipment.indexOf(
                equipmentId
            );


        if (index === -1) {

            return false;

        }


        const equipment =
            equipmentData?.equipment?.find(
                item =>
                    item.id ===
                    equipmentId
            );


        if (equipment) {

            /*
             * Refund the equipment cost.
             *
             * Campaign selling rules will eventually
             * be handled separately.
             */

            warband.treasury +=
                Number(
                    equipment.cost
                ) || 0;

        }


        fighter.equipment.splice(
            index,
            1
        );


        return true;

    }


    /* ============================================================
       FIGHTER NAME
       ============================================================ */

    function generateFighterName(
        fighterType,
        warband
    ) {

        const existing =
            warband.fighters.filter(

                fighter =>
                    fighter.type ===
                    fighterType.id

            ).length;


        return `${fighterType.name} ${existing + 1}`;

    }


    /* ============================================================
       ID
       ============================================================ */

    function generateId(
        prefix
    ) {

        return `${prefix}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    return {

        createWarband,

        createFighter,

        addFighter,

        removeFighter,

        addEquipment,

        removeEquipment

    };

})();


window.MordeManager =
    MordeManager;
