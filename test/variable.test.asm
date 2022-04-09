		.out ""
		.out "*************************************"
		.out "              VARIABLES              "
		.out "*************************************"
		.out ""

		.out ""
		.out "-1- define var 'var_spriteIdx= 10' and output value"
		.out ""

var_spriteIdx= 10

		.out var_spriteIdx

		.out ""
		.out "-2- define yaml var"
		.out ""

		.define var_yaml
		- one
		- two
		.end

		.out "var_yaml = " var_yaml
