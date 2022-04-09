		.out ""
		.out "*************************************"
		.out "              FUNCTIONS              "
		.out "*************************************"
		.out ""

		.out ""
		.out "-1- define var 'fn_test= 10' and check if defined"
		.out ""

		.out %DEBUG% SYM .DEF(fn_test)

fn_test= 10
		.if .def("fn_test")
			.out "fn_test is defined : " fn_test
		.end

		.out ""
		.out "-2- check if fn_test is not defined"
		.out ""

		.if .undef("fn_test")
			.out "fn_test is undefined : " fn_test
		.end


		.out ""
		.out "-3- check if <unknown_var> is defined or not"
		.out ""

		.if .def("unknown_var")
			.out "unknown_var is defined : " unknown_var
		.end
		.if .undef("unknown_var")
			.out "unknown_var is undefined"
		.end

		.out ""
		.out "-4- output string length"
		.out ""

		;.out .len "123456"