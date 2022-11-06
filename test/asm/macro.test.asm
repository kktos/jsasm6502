
		.out ""
		.out "*************************************"
		.out "                MACROS               "
		.out "*************************************"
		.out ""

		.out ""
		.out "-1- empty macro should show a warning"
		.out ""

		.macro test
		.end


		.out ""
		.out "-2- test if parm exists"

		.macro test2 toto
			.if .def(toto)
				.out "toto is defined"
			.end
			.if .undef(toto)
				.out "toto is undefined"
			.end
		.end


		.out ""
		.out "-2.1- call with no parm should display undefined"
		.out ""
		test2

		.out ""
		.out "-2.3- call with parm should display defined"
		.out ""
		test2 1
		