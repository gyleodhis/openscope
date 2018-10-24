import ava from 'ava';
import sinon from 'sinon';
import AircraftModel from '../../src/assets/scripts/client/aircraft/AircraftModel';
import NavigationLibrary from '../../src/assets/scripts/client/navigationLibrary/NavigationLibrary';
import UiController from '../../src/assets/scripts/client/UiController';
import GameController, { GAME_EVENTS } from '../../src/assets/scripts/client/game/GameController';
import {
    createAirportControllerFixture,
    resetAirportControllerFixture,
    airportModelFixture
} from '../fixtures/airportFixtures';
import {
    createNavigationLibraryFixture,
    resetNavigationLibraryFixture
} from '../fixtures/navigationLibraryFixtures';
import {
    ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK,
    ARRIVAL_AIRCRAFT_INIT_PROPS_WITH_SOFT_ALTITUDE_RESTRICTIONS_MOCK,
    DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK
} from './_mocks/aircraftMocks';
import {
    FLIGHT_PHASE,
    PERFORMANCE
} from '../../src/assets/scripts/client/constants/aircraftConstants';
import { AIRPORT_CONSTANTS } from '../../src/assets/scripts/client/constants/airportConstants';

let sandbox; // using the sinon sandbox ensures stubs are restored after each test

// mocks
const runwayNameMock = '19L';
const runwayModelMock = airportModelFixture.getRunway(runwayNameMock);

/* eslint-disable no-unused-vars, no-undef */
ava.beforeEach(() => {
    createNavigationLibraryFixture();
    createAirportControllerFixture();
    sandbox = sinon.sandbox.create();
});

ava.afterEach(() => {
    resetNavigationLibraryFixture();
    resetAirportControllerFixture();
    sandbox.restore();
});
/* eslint-enable no-unused-vars, no-undef */

ava('does not throw with valid parameters', (t) => {
    t.notThrows(() => new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK));
});

ava('.cancelLanding() returns early when called for an aircraft projection', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const radioCallSpy = sinon.spy(model, 'radioCall');
    model.projected = true;
    const result = model.cancelLanding();

    t.true(typeof result === 'undefined');
    t.true(radioCallSpy.notCalled);
});

ava('.cancelLanding() configures MCP correctly when landing is cancelled at or above the missed approach altitude', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const mcpSetAltitudeFieldValueStub = sinon.spy(model.mcp, 'setAltitudeFieldValue');
    const mcpSetAltitudeHoldStub = sinon.spy(model.mcp, 'setAltitudeHold');
    const mcpSetHeadingFieldValueStub = sinon.spy(model.mcp, 'setHeadingFieldValue');
    const mcpSetHeadingHoldStub = sinon.spy(model.mcp, 'setHeadingHold');
    const setFlightPhaseStub = sinon.spy(model, 'setFlightPhase');
    const radioCallStub = sandbox.stub(model, 'radioCall');
    model.hasApproachClearance = true;
    model.fms.arrivalRunwayModel._positionModel.elevation = 65;
    model.altitude = 5310;
    model.heading = 0.25;
    const expectedRadioTranscript = 'going missed approach, present heading, leveling at 5000';
    const result = model.cancelLanding();

    t.true(typeof result === 'undefined');
    t.true(mcpSetAltitudeFieldValueStub.calledWithExactly(5000));
    t.true(mcpSetAltitudeHoldStub.calledWithExactly());
    t.true(mcpSetHeadingFieldValueStub.calledWithExactly(0.25));
    t.true(mcpSetHeadingHoldStub.calledWithExactly());
    t.true(setFlightPhaseStub.calledWithExactly(FLIGHT_PHASE.DESCENT));
    t.true(radioCallStub.calledWithExactly(expectedRadioTranscript, 'app', true));
});

ava('.cancelLanding() configures MCP correctly when landing cancelled below the missed approach altitude', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const mcpSetAltitudeFieldValueStub = sinon.spy(model.mcp, 'setAltitudeFieldValue');
    const mcpSetAltitudeHoldStub = sinon.spy(model.mcp, 'setAltitudeHold');
    const mcpSetHeadingFieldValueStub = sinon.spy(model.mcp, 'setHeadingFieldValue');
    const mcpSetHeadingHoldStub = sinon.spy(model.mcp, 'setHeadingHold');
    const setFlightPhaseStub = sinon.spy(model, 'setFlightPhase');
    const radioCallStub = sandbox.stub(model, 'radioCall', (a) => a);
    model.hasApproachClearance = true;
    model.fms.arrivalRunwayModel._positionModel.elevation = 65;
    model.altitude = 1300;
    model.heading = 0.25;
    const expectedRadioTranscript = 'going missed approach, present heading, climbing to 3000';
    const result = model.cancelLanding();

    t.true(typeof result === 'undefined');
    t.true(mcpSetAltitudeFieldValueStub.calledWithExactly(3000));
    t.true(mcpSetAltitudeHoldStub.calledWithExactly());
    t.true(mcpSetHeadingFieldValueStub.calledWithExactly(0.25));
    t.true(mcpSetHeadingHoldStub.calledWithExactly());
    t.true(setFlightPhaseStub.calledWithExactly(FLIGHT_PHASE.DESCENT));
    t.true(radioCallStub.calledWithExactly(expectedRadioTranscript, 'app', true));
});

ava('.getViewModel() includes an altitude that has not been rounded to the nearest foot', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.mcp.altitude = 7777.1234567;

    const { assignedAltitude: result } = model.getViewModel();

    t.true(result === 77.77123456700001);
});

ava('.isAboveGlidepath() returns false when aircraft altitude is below glideslope altitude', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.altitude = 3000;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => 4137);

    const result = model.isAboveGlidepath();

    t.false(result);
});

ava('.isAboveGlidepath() returns false when aircraft altitude is at glideslope altitude', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.altitude = 4137;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => 4137);

    const result = model.isAboveGlidepath();

    t.false(result);
});

ava('.isAboveGlidepath() returns true when aircraft altitude is above glideslope altitude', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.altitude = 5500;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => 4137);

    const result = model.isAboveGlidepath();

    t.true(result);
});

ava('.isEstablishedOnCourse() returns false when no arrival runway has been assigned', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.fms.arrivalRunwayModel = null;
    const result = model.isEstablishedOnCourse();

    t.false(result);
});

ava('.isEstablishedOnCourse() returns false when neither aligned with approach course nor on approach heading', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);

    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnApproachCourse', () => false);
    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnCorrectApproachHeading', () => false);

    const result = model.isEstablishedOnCourse();

    t.false(result);
});

ava('.isEstablishedOnCourse() returns false when aligned with approach course but not on approach heading', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);

    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnApproachCourse', () => true);
    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnCorrectApproachHeading', () => false);

    const result = model.isEstablishedOnCourse();

    t.false(result);
});

ava('.isEstablishedOnCourse() returns false when on approach heading but not aligned with approach course', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);

    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnApproachCourse', () => false);
    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnCorrectApproachHeading', () => true);

    const result = model.isEstablishedOnCourse();

    t.false(result);
});

ava('.isEstablishedOnCourse() returns true when aligned with approach course and on approach heading', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);

    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnApproachCourse', () => true);
    sandbox.stub(model.fms.arrivalRunwayModel, 'isOnCorrectApproachHeading', () => true);

    const result = model.isEstablishedOnCourse();

    t.true(result);
});

ava('.isEstablishedOnGlidepath() returns false when too far above glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const glideslopeAltitude = 4000;
    model.altitude = glideslopeAltitude + PERFORMANCE.MAXIMUM_ALTITUDE_DIFFERENCE_CONSIDERED_ESTABLISHED_ON_GLIDEPATH + 1;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => glideslopeAltitude);

    const result = model.isEstablishedOnGlidepath();

    t.false(result);
});

ava('.isEstablishedOnGlidepath() returns false when too far below glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const glideslopeAltitude = 4000;
    model.altitude = glideslopeAltitude - PERFORMANCE.MAXIMUM_ALTITUDE_DIFFERENCE_CONSIDERED_ESTABLISHED_ON_GLIDEPATH - 1;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => glideslopeAltitude);

    const result = model.isEstablishedOnGlidepath();

    t.false(result);
});

ava('.isEstablishedOnGlidepath() returns true when an acceptable distance above glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const glideslopeAltitude = 4000;
    model.altitude = glideslopeAltitude + PERFORMANCE.MAXIMUM_ALTITUDE_DIFFERENCE_CONSIDERED_ESTABLISHED_ON_GLIDEPATH;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => glideslopeAltitude);

    const result = model.isEstablishedOnGlidepath();

    t.true(result);
});

ava('.isEstablishedOnGlidepath() returns true when an acceptable distance below glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const glideslopeAltitude = 4000;
    model.altitude = glideslopeAltitude - PERFORMANCE.MAXIMUM_ALTITUDE_DIFFERENCE_CONSIDERED_ESTABLISHED_ON_GLIDEPATH;

    sandbox.stub(model, '_calculateArrivalRunwayModelGlideslopeAltitude', () => glideslopeAltitude);

    const result = model.isEstablishedOnGlidepath();

    t.true(result);
});

ava('.isOnFinal() returns false when neither on the selected course nor within the final approach fix distance', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const isEstablishedOnCourse = false;
    const distanceToDatum = AIRPORT_CONSTANTS.FINAL_APPROACH_FIX_DISTANCE_NM + 1;

    sandbox.stub(model, 'isEstablishedOnCourse', () => isEstablishedOnCourse);
    sandbox.stub(model.positionModel, 'distanceToPosition', () => distanceToDatum);

    const result = model.isOnFinal();

    t.false(result);
});

ava('.isOnFinal() returns false when on the selected course but not within the final approach fix distance', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const isEstablishedOnCourse = true;
    const distanceToDatum = AIRPORT_CONSTANTS.FINAL_APPROACH_FIX_DISTANCE_NM + 1;

    sandbox.stub(model, 'isEstablishedOnCourse', () => isEstablishedOnCourse);
    sandbox.stub(model.positionModel, 'distanceToPosition', () => distanceToDatum);

    const result = model.isOnFinal();

    t.false(result);
});

ava('.isOnFinal() returns false when within the final approach fix distance but not on the selected course', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const isEstablishedOnCourse = false;
    const distanceToDatum = AIRPORT_CONSTANTS.FINAL_APPROACH_FIX_DISTANCE_NM;

    sandbox.stub(model, 'isEstablishedOnCourse', () => isEstablishedOnCourse);
    sandbox.stub(model.positionModel, 'distanceToPosition', () => distanceToDatum);

    const result = model.isOnFinal();

    t.false(result);
});

ava('.isOnFinal() returns true when both on the selected course and within the final approach fix distance', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const isEstablishedOnCourse = true;
    const distanceToDatum = AIRPORT_CONSTANTS.FINAL_APPROACH_FIX_DISTANCE_NM;

    sandbox.stub(model, 'isEstablishedOnCourse', () => isEstablishedOnCourse);
    sandbox.stub(model.positionModel, 'distanceToPosition', () => distanceToDatum);

    const result = model.isOnFinal();

    t.true(result);
});

ava('.judgeLocalizerInterception() returns early when called for an aircraft projection', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.projected = true;
    const penalizeLocalizerInterceptAltitudeStub = sandbox.stub(model, 'penalizeLocalizerInterceptAltitude');
    const result = model.judgeLocalizerInterception();

    t.true(typeof result === 'undefined');
    t.true(penalizeLocalizerInterceptAltitudeStub.notCalled);
});

ava('.judgeLocalizerInterception() does not call .penalizeLocalizerInterceptAltitude() when at or below glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const penalizeLocalizerInterceptAltitudeStub = sandbox.stub(model, 'penalizeLocalizerInterceptAltitude');

    sandbox.stub(model, 'isAboveGlidepath', () => false);

    const result = model.judgeLocalizerInterception();

    t.true(typeof result === 'undefined');
    t.true(penalizeLocalizerInterceptAltitudeStub.notCalled);
});

ava('.judgeLocalizerInterception() calls .penalizeLocalizerInterceptAltitude() when above glideslope', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const penalizeLocalizerInterceptAltitudeStub = sandbox.stub(model, 'penalizeLocalizerInterceptAltitude');

    sandbox.stub(model, 'isAboveGlidepath', () => true);

    const result = model.judgeLocalizerInterception();

    t.true(typeof result === 'undefined');
    t.true(penalizeLocalizerInterceptAltitudeStub.calledWithExactly());
});

ava('.penalizeLocalizerInterceptAltitude() records an event and notifies the user of their error', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const uiControllerUiLogStub = sandbox.stub(UiController, 'ui_log');
    const gameControllerRecordEventStub = sandbox.stub(GameController, 'events_recordNew');
    const expectedLogMessage = `${model.getCallsign()} intercepted localizer above glideslope`;
    const result = model.penalizeLocalizerInterceptAltitude();

    t.true(typeof result === 'undefined');
    t.true(uiControllerUiLogStub.calledWithExactly(expectedLogMessage, true));
    t.true(gameControllerRecordEventStub.calledWithExactly(GAME_EVENTS.LOCALIZER_INTERCEPT_ABOVE_GLIDESLOPE));
});

ava('.penalizeLocalizerInterceptAngle() records an event and notifies the user of their error', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const uiControllerUiLogStub = sandbox.stub(UiController, 'ui_log');
    const gameControllerRecordEventStub = sandbox.stub(GameController, 'events_recordNew');
    const expectedLogMessage = `${model.getCallsign()} approach course intercept angle was greater than 30 degrees`;
    const result = model.penalizeLocalizerInterceptAngle();

    t.true(typeof result === 'undefined');
    t.true(uiControllerUiLogStub.calledWithExactly(expectedLogMessage, true));
    t.true(gameControllerRecordEventStub.calledWithExactly(GAME_EVENTS.ILLEGAL_APPROACH_CLEARANCE));
});

ava('._calculateArrivalRunwayModelGlideslopeAltitude() returns arrival runway\'s glideslope altitude abeam the specified position', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const expectedResult = 3994.129742601768;

    t.true(model.fms.arrivalRunwayModel.name === '07R');

    // TODO: why does this not work?
    // const arrivalRunwayModel = model.fms.arrivalRunwayModel;
    // const distanceOnFinalNm = 7;
    // model.positionModel.setCoordinates(arrivalRunwayModel.positionModel.gps);
    // model.positionModel.setCoordinatesByBearingAndDistance(arrivalRunwayModel.oppositeAngle, distanceOnFinalNm);

    // using this direct coordinate instead of calculating it above
    model.positionModel.setCoordinates([36.0383336961, -115.26973855167]);

    const result = model._calculateArrivalRunwayModelGlideslopeAltitude();

    t.true(result === expectedResult);
});

ava('.matchCallsign() returns false when passed a flightnumber that is not included in #callsign', (t) => {
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);

    t.false(model.matchCallsign('42'));
});

ava('.matchCallsign() returns true when passed `*`', (t) => {
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);

    t.true(model.matchCallsign('*'));
});

ava('.matchCallsign() returns true when passed a flightnumber that is included in #callsign', (t) => {
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);

    t.true(model.matchCallsign('1567'));
});

ava('.matchCallsign() returns true when passed a lowercase callsign that matches #callsign', (t) => {
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);

    t.true(model.matchCallsign('ual1567'));
});

ava('.matchCallsign() returns true when passed a mixed case callsign that matches #callsign', (t) => {
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);

    t.true(model.matchCallsign('uAl1567'));
});

ava('.updateTarget() causes arrivals to descend when the STAR includes only AT or ABOVE altitude restrictions', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_WITH_SOFT_ALTITUDE_RESTRICTIONS_MOCK);
    model.positionModel = NavigationLibrary.findFixByName('LEMNZ').positionModel;

    model.groundSpeed = 320;
    model.updateTarget();

    t.true(model.target.altitude === 7000);
});

ava('.updateTarget() causes arrivals to descend when the STAR includes AT altitude restrictions', (t) => {
    const model = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    model.positionModel = NavigationLibrary.findFixByName('MISEN').positionModel;

    model.groundSpeed = 320;
    model.updateTarget();

    t.true(model.target.altitude === 8000);
});

ava('.taxiToRunway() returns an error when the aircraft is airborne', (t) => {
    const expectedResult = [false, 'unable to taxi, we\'re airborne'];
    const arrival = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    const arrivalResult = arrival.taxiToRunway(runwayModelMock);

    t.deepEqual(arrivalResult, expectedResult);

    const departure = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);
    departure.altitude = 28000;

    const departureResult = departure.taxiToRunway(runwayModelMock);
    t.deepEqual(departureResult, expectedResult);
});

ava('.taxiToRunway() returns an error when the aircraft has landed', (t) => {
    const expectedResult = [false, 'unable to taxi to runway, we have just landed'];
    const arrival = new AircraftModel(ARRIVAL_AIRCRAFT_INIT_PROPS_MOCK);
    arrival.altitude = arrival.fms.arrivalAirportModel.elevation;

    const arrivalResult = arrival.taxiToRunway(runwayModelMock);

    t.deepEqual(arrivalResult, expectedResult);
});

ava('.taxiToRunway() cancels IFR clearance if runway is invalid for the assigned SID', (t) => {
    const expectedResult = [
        true,
        {
            log: 'taxi to runway 01R',
            say: 'taxi to runway zero one right'
        }
    ];
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);
    // BOACH6 is the only SID with an invalid runway
    model.fms.replaceFlightPlanWithNewRoute('KLAS07R.BOACH6.HEC');
    model.pilot.hasDepartureClearance = true;

    const invalidRunway = airportModelFixture.getRunway('01R');

    const result = model.taxiToRunway(invalidRunway);

    t.deepEqual(result, expectedResult);
    t.false(model.pilot.hasDepartureClearance);
});

ava('.taxiToRunway() returns a success message when finished', (t) => {
    const expectedResult = [
        true,
        {
            log: 'taxi to runway 19L',
            say: 'taxi to runway one niner left'
        }
    ];
    const model = new AircraftModel(DEPARTURE_AIRCRAFT_INIT_PROPS_MOCK);
    const result = model.taxiToRunway(runwayModelMock);

    t.deepEqual(result, expectedResult);
    t.deepEqual(model.flightPhase, FLIGHT_PHASE.TAXI);
    t.deepEqual(model.fms.departureRunwayModel, runwayModelMock);
});
