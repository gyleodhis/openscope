import BaseModel from '../../base/BaseModel';

/**
 * Symbol that prepends a fixname indicating the aircraft should enter
 * a holding pattern once it arrives at the fix.
 *
 * @property
 * @type {string}
 * @final
 */
const HOLD_SEGMENT_SYMBOL = '@';

/**
 * Symbol that divides each route segment
 *
 * @property SEGMENT_SEPARATION_SYMBOL
 * @type {string}
 * @final
 */
const SEGMENT_SEPARATION_SYMBOL = '.';

/**
 * A route is assumed to have, at most, three parts.
 *
 * @property MAXIMUM_ROUTE_SEGMENT_LENGTH
 * @type {number}
 * @final
 */
const MAXIMUM_ROUTE_SEGMENT_LENGTH = 3;

// TODO: this class needs a better name
/**
 * @class RouteModel
 */
export default class RouteModel extends BaseModel {
    /**
     * example `routeCode`
     *
     * ```
     * 'BETHL.GRNPA1.KLAS'
     * ```
     *
     * // TODO: should be able to support input of:
     * - KSFO.OFFSH9.SXC.V458.IPL.J2.JCT..LLO..ACT..KACT
     * which can be returned as:
     * - ['KSFO.OFFSH9.SXC', 'SXC.V458.IPL', 'IPL.J2.JCT', 'LLO', 'ACT', 'KACT']
     *
     * @for RouteModel
     * @constructor
     * @param routeCode {string}
     */
    constructor(routeCode) {
        super();

        if (typeof routeCode === 'undefined' || typeof routeCode !== 'string') {
            console.error(`Invalid data type passed to RouteModel. Expected a string but received ${routeCode}`);

            return;
        }

        if (!this._isValidRouteCode(routeCode)) {
            // eslint-disable-next-line max-len
            throw new TypeError(`Invalid routeCode passed to RouteModel. Expected a routeCode of the shape ORIGIN.BASE.DESTINATION but instead received ${routeCode}`);
        }

        /**
         * @property entry
         * @type {string}
         * @default ''
         */
        this.entry = '';

        /**
         * @property procedure
         * @type {string}
         * @default ''
         */
        this.procedure = '';

        /**
         * @property exit
         * @type {string}
         * @default ''
         */
        this.exit = '';

        return this._init(routeCode);
    }

    /**
     * A single string that represents the entire route
     *
     * @property routeCode
     * @return {string}
     */
    get routeCode() {
        return `${this.entry}.${this.procedure}.${this.exit}`;
    }

    /**
     * Lifecycle method. Should be run only once on instantiation
     *
     * @for RouteModel
     * @method _init
     * @param routeCode {string}
     * @private
     */
    _init(routeCode) {
        const { entry, base, exit } = this._extractSegmentNamesFromRouteCode(routeCode);

        this.entry = entry.toUpperCase();
        this.procedure = base.toUpperCase();
        this.exit = exit.toUpperCase();

        return this;
    }

    /**
     * reset this instance
     *
     * @for RouteModel
     * @method reset
     */
    reset() {
        this.entry = '';
        this.procedure = '';
        this.exit = '';
    }

    /**
     * @for RouteModel
     * @method _extractSegmentNamesFromRouteCode
     * @param routeCode {string}
     * @return {object}
     * @private
     */
    _extractSegmentNamesFromRouteCode(routeCode) {
        const routeSegments = routeCode.split(SEGMENT_SEPARATION_SYMBOL);

        return {
            entry: routeSegments[0],
            base: routeSegments[1],
            exit: routeSegments[2]
        };
    }

    /**
     * Verify that a routeString has exactly 3 segments
     *
     * @for RouteModel
     * @method _isValidRouteCode
     * @param routeString {string}
     * @return {boolean}
     * @private
     */
    _isValidRouteCode(routeString) {
        return RouteModel.isProcedureRouteString(routeString);
    }
}

/**
 * Used to determine if a string is in the shape of a `procedureRouteString`.
 *
 * Example:
 * - 'ENTRY.PROCEDURE_NAME.EXIT'
 *
 * @for RouteModel
 * @method isProcedureRouteString
 * @param routeString {string}
 * @return {boolean}
 * @static
 */
RouteModel.isProcedureRouteString = (routeString) => {
    const elements = routeString.split(SEGMENT_SEPARATION_SYMBOL);
    const hasRightNumberOfElements = elements.length === MAXIMUM_ROUTE_SEGMENT_LENGTH;
    const isDirectRouteSegment = elements[1] === '';

    return hasRightNumberOfElements && !isDirectRouteSegment;
};

/**
 * Used to determine if a string is in the shape of a `holdRouteString`
 *
 * Example:
 * - `@COWBY`
 *
 * @for RouteModel
 * @method isHoldRouteString
 * @param routeString {string}
 * @return {boolean}
 * @static
 */
RouteModel.isHoldRouteString = (routeString) => routeString.indexOf(HOLD_SEGMENT_SYMBOL) !== -1;
