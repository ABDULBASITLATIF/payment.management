/*global QUnit*/

sap.ui.define([
	"zfi/payment/management/controller/NewDoc.controller"
], function (Controller) {
	"use strict";

	QUnit.module("NewDoc Controller");

	QUnit.test("I should test the NewDoc controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
